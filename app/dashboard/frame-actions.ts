'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'   // (pending modules S43A) this browser's member, never the standing flag
import { HIDEABLE, parsePrefs, switchesScope, type DashCardKey, type DashPrefs, type DashScope } from '@/lib/dashboard/frame'
import { visitOf } from '@/lib/dashboard/since'

/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-02 · Q-06 · Q-07 · lane D1) The page's frame on the member's own record: the visit's
 * mark ("Since you were last here") and their own page — the cards they hid, an Owner's or Admin's Studio / Mine. Each answers `{ error }`
 * when refused (the house rule); nothing here revalidates the page under the member's cursor (his "the page refreshes when you come back to
 * it, never under your cursor") — the page asks for its own refresh where it needs one.
 */

/** Once the page has drawn: the latest view is now, and the sitting's mark moves when a new sitting begins (lib/dashboard/since.ts `visitOf`).
    Idempotent within a sitting — a reload, a Back, a second tab keep the same mark. */
export async function markDashboardVisit(): Promise<{ ok: true } | { error: string }> {
  const id = await sessionMemberId()
  const [m] = await db.select({ seenAt: members.dashboardSeenAt, sinceAt: members.dashboardSinceAt }).from(members).where(eq(members.id, id)).limit(1)
  if (!m) return { error: 'Your member record isn’t there any more' }
  const next = visitOf(m.seenAt?.getTime() ?? null, m.sinceAt?.getTime() ?? null, Date.now())
  await db.update(members).set({ dashboardSeenAt: new Date(next.seenAt), dashboardSinceAt: new Date(next.sinceAt) }).where(eq(members.id, id))
  return { ok: true }
}

/** The member's own page (his Q-06 · Q-07): `hidden` = the cards they hid (Needs you never hides), `scope` = Studio or Mine (an Owner's or an
    Admin's switch). Returns the page as stored, so a caller can put its view back when a write is refused. */
export async function setDashboardPrefs(patch: { hidden?: string[]; scope?: string | null }): Promise<{ ok: true; prefs: DashPrefs } | { error: string }> {
  const id = await sessionMemberId()
  const [m] = await db.select({ role: members.role, prefs: members.dashboardPrefs }).from(members).where(eq(members.id, id)).limit(1)
  if (!m) return { error: 'Your member record isn’t there any more' }
  const was = parsePrefs(m.prefs)
  let hidden = was.hidden
  if (patch.hidden !== undefined) {
    if (!Array.isArray(patch.hidden) || patch.hidden.some((k) => !(HIDEABLE as readonly string[]).includes(k))) return { error: 'Needs you always stays on the page' }
    hidden = [...new Set(patch.hidden as DashCardKey[])]
  }
  let scope: DashScope | null = was.scope
  if (patch.scope !== undefined) {
    if (patch.scope !== null && patch.scope !== 'studio' && patch.scope !== 'mine') return { error: 'The page shows the studio or your own work' }
    if (patch.scope === 'mine' && !switchesScope(m.role)) return { error: 'Your page is already your own work — Studio and Mine are for Owners and Admins' }
    scope = patch.scope
  }
  const prefs: DashPrefs = { hidden, scope }
  await db.update(members).set({ dashboardPrefs: JSON.stringify(prefs) }).where(eq(members.id, id))
  return { ok: true, prefs }
}
