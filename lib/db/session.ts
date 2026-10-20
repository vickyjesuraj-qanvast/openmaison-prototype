import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, studioSessions } from '@/lib/db/schema'
import { PATH_HEADER, RENEW_MS, SESSION_COOKIE, isPublicPath, parseSessionCookie, signInHref } from '@/lib/auth/paths'

/**
 * WHO IS WRITING (REG-286) — the one place that says which member a request is, for every read and every write stamp.
 *
 * (pending modules S43A — the S42 audit's call A·1, built as recommended on his "fix all the pending things" 2026-10-15) ONE SIGNED-IN MEMBER
 * PER BROWSER. A browser that signed in by a code (`/sign-in`, or Join on an invitation) is the member its own session record names
 * (`studio_sessions`, the cookie carries its id — lib/auth/session.ts starts and ends it) — on every page, every action and every stamp — and
 * only that browser. A browser that never signed in or out is the demo's STANDING session: the member `members.is_you` flags (Dane in the base
 * state). (REG-667) Demo Studio › View as moves that flag — every standing browser follows — and the browser that pressed it follows too (a
 * code-signed one moves its own record); "Reset prototype to base" puts the flag back on Dane and ends every code-signed session.
 *
 * Read once per request (React's `cache`). Outside a request (a script, the repair, a job with no browser) the standing member answers.
 * A write stamp takes the id as a plain value, read BEFORE any transaction opens (`const me = await sessionMemberId()`): the static SQL
 * subquery on the flag that stamps used to carry (`sessionMemberSql`) is gone, so no stamp can follow the flag over the browser's own member.
 * Member rows reach the app through `withYou` / `markYou` — `isYou` is this request's member, never the flag (the schema names the flag
 * `standingYou` so that nothing reads it as "you" by mistake).
 *
 * PRODUCTION: `DEMO_STANDING_SESSION = false` (lib/auth/paths.ts) — a browser with no session of its own is signed out, so the flag and View
 * as go with it; everything here keeps reading the session.
 */
/* (S44 closing regression, 2026-10-15) `next/navigation` is loaded only where it is used. A static import made every script that asks who is
   writing (the repair, the seam probes, a job with no request) load Next's client navigation, which a plain Node process can't — the
   import threw before any member was read. Outside Next it can't load, and there is then no request to rethrow for. */
async function rethrowNext(e: unknown): Promise<void> {
  let nav: typeof import('next/navigation')
  try { nav = await import('next/navigation') } catch { return }
  nav.unstable_rethrow(e)
}

export const SESSION_MEMBER_ID = 'dane'   // who the standing session is when no member carries the flag

/** The member the demo's standing session is — View as's pick (`members.is_you`), else Dane. */
export const standingMemberId = cache(async (): Promise<string> => {
  const [m] = await db.select({ id: members.id }).from(members).where(eq(members.standingYou, true)).limit(1)
  return m?.id ?? SESSION_MEMBER_ID
})

/** This browser's own session, as its record says. `none`: no session cookie — the demo's standing session, a signed-out browser, or no
    request at all. `dead`: the cookie names a record that ended (signed out, replaced, Reset), ran out, or whose member was deactivated. */
export type BrowserSession =
  | { kind: 'none' }
  | { kind: 'live'; sessionId: string; memberId: string; remember: boolean; lastSeenAt: Date }
  | { kind: 'dead'; reason: 'out' | 'ended' | 'deactivated' }

/** Reads only — safe wherever a member is asked; the record's renewal is the shell's (lib/auth/session.ts `readStudioSession`). */
export const browserSession = cache(async (): Promise<BrowserSession> => {
  let raw: string | undefined
  /* outside a request there are no cookies — the standing member answers. Never swallow Next's own signals (a build's prerender learning
     that a page is dynamic — S30's lesson): `unstable_rethrow` throws them on. */
  try { raw = (await cookies()).get(SESSION_COOKIE)?.value } catch (e) { await rethrowNext(e); return { kind: 'none' } }
  const c = parseSessionCookie(raw)
  if (!c) return { kind: 'none' }
  const [row] = await db.select().from(studioSessions).where(eq(studioSessions.id, c.id)).limit(1)
  if (!row) return { kind: 'dead', reason: 'ended' }   // a Reset took every record away
  if (row.endedAt) return { kind: 'dead', reason: row.endedReason === 'signed-out' ? 'out' : row.endedReason === 'deactivated' ? 'deactivated' : 'ended' }
  /* the record's own end — with an hour's grace, since a remembered session's record renews hourly while its cookie renews on every page */
  if (row.expiresAt.getTime() + RENEW_MS <= Date.now()) return { kind: 'dead', reason: 'ended' }
  const [m] = await db.select({ isActive: members.isActive }).from(members).where(eq(members.id, row.memberId)).limit(1)
  if (!m?.isActive) return { kind: 'dead', reason: 'deactivated' }
  return { kind: 'live', sessionId: row.id, memberId: row.memberId, remember: row.remember, lastSeenAt: row.lastSeenAt }
})

/**
 * A browser whose own session has ended asks who it is on a studio address — an action pressed on a page that was open when its session
 * ended (Reset, a deactivation, the 24 hours run out): it goes to sign-in, as the shell sends its next page, and nothing is read or stamped
 * as the standing session's member. On a client link (open to anyone) it reads as any signed-out browser does.
 */
async function refuseEnded(reason: 'out' | 'ended' | 'deactivated'): Promise<void> {
  let path: string | null = null
  try { path = (await headers()).get(PATH_HEADER) } catch (e) { await rethrowNext(e) }
  if (!path) return
  const at = new URL(path, 'http://studio.local')
  if (isPublicPath(at.pathname, at.searchParams.has('t'))) return
  const { redirect } = await import('next/navigation')
  redirect(signInHref({ next: path, reason: reason === 'out' ? null : reason }))   // the shell's own words for it (lib/auth/session.ts `requireStudioSignIn`)
}

/** The signed-in member's id — read once per request: this browser's own session (a code sign-in, a join), else the standing session's. */
export const sessionMemberId = cache(async (): Promise<string> => {
  const s = await browserSession()
  if (s.kind === 'live') return s.memberId
  if (s.kind === 'dead') await refuseEnded(s.reason)
  return standingMemberId()
})

/** Member rows as the app reads them, given this request's member: `isYou` is theirs, and the standing session's flag (a whole row's
    `standingYou`) stays behind. A select of a few columns needs only `id`. */
export function markYou<T extends { id: string; standingYou?: boolean }>(rows: readonly T[], me: string): Array<Omit<T, 'standingYou'> & { isYou: boolean }> {
  return rows.map(({ standingYou: _flag, ...m }) => ({ ...m, isYou: m.id === me }))
}
/** The same, asking who this request is. */
export async function withYou<T extends { id: string; standingYou?: boolean }>(rows: readonly T[]): Promise<Array<Omit<T, 'standingYou'> & { isYou: boolean }>> {
  return markYou(rows, await sessionMemberId())
}

/** (REG-667) A member as Demo Studio › View as lists them. */
export type SessionMember = { id: string; name: string; role: string; color: string; isYou: boolean; reportsTo: string | null
  /** (pending modules S16 — 1.0's top bar "Open / Closed") whether the member takes new leads (`members.accepting_leads`, REG-612): the studio
      block's menu shows you yours */
  acceptingLeads: boolean }

/** (REG-667) The studio's active members for the View as menu — Owners first, then Admins, Managers, Designers. (S43A) "You" is this
    browser's member: a code-signed browser sees itself ticked, whatever the standing session is. */
export async function fetchSessionTeam(): Promise<SessionMember[]> {
  const [rows, me] = await Promise.all([
    db.select({ id: members.id, name: members.name, role: members.role, color: members.color, managerId: members.managerId, isActive: members.isActive, acceptingLeads: members.acceptingLeads })
      .from(members).orderBy(asc(members.name)),
    sessionMemberId(),
  ])
  const byId = new Map(rows.map((m) => [m.id, m.name]))
  const rank: Record<string, number> = { Owner: 0, Admin: 1, Manager: 2, Designer: 3 }
  return rows.filter((m) => m.isActive || m.id === me)
    .map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color, isYou: m.id === me, reportsTo: m.managerId ? byId.get(m.managerId) ?? null : null, acceptingLeads: m.acceptingLeads }))
    .sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.name.localeCompare(b.name))
}
