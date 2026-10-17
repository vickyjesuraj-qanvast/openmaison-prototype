'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { EVENTS, type EventKey } from '@/lib/notifications/model'
import { NO_EMAIL_LINE, emailModeOf, parseMuted, type EmailMode } from '@/lib/notifications/personal'
import { forgetSummaryLook, sendSummaryNow, type SummaryView } from '@/lib/notifications/summary-server'

/*
 * (pending modules S18 — Leads Q-42 · Q-43 opened as recommended) Your profile › Your notifications: each member's own mute and how their
 * emails come. The signed-in member's own row only — never anyone else's (no member sets another's, as Your profile's details); the studio's
 * rules stay Settings › Notifications' (Owners and Admins). A refusal answers `{ error: <the rule> }`.
 */
const KNOWN = EVENTS.map((e) => e.key)
const touch = () => { revalidatePath('/profile') }

async function mine() {
  const id = await sessionMemberId()
  const [m] = await db.select({ id: members.id, email: members.email, noticeMuted: members.noticeMuted, isActive: members.isActive }).from(members).where(eq(members.id, id)).limit(1)
  return m ?? null
}

/** As they happen · A daily summary. The summary needs an email to go to. */
export async function setMyEmailMode(mode: unknown): Promise<{ mode: EmailMode } | { error: string }> {
  if (mode !== 'each' && mode !== 'daily') return { error: 'Choose As they happen or A daily summary' }
  const m = await mine()
  if (!m) return { error: 'Your profile isn’t there any more' }
  if (mode === 'daily' && !m.email?.trim()) return { error: NO_EMAIL_LINE }
  await db.update(members).set({ noticeEmail: mode === 'daily' ? 'daily' : null, noticeEmailAt: mode === 'daily' ? new Date() : null }).where(eq(members.id, m.id))
  forgetSummaryLook(m.id)   // the first summary goes at the next 8 AM after the choice
  touch()
  return { mode: emailModeOf(mode) }
}

/** Mute one event for yourself, or let it reach you again. Answers the whole list as it now is. */
export async function setMyMute(input: { event: unknown; muted: unknown }): Promise<{ muted: EventKey[] } | { error: string }> {
  const event = typeof input?.event === 'string' && (KNOWN as string[]).includes(input.event) ? (input.event as EventKey) : null
  if (!event) return { error: 'That isn’t a notice the studio sends' }
  const m = await mine()
  if (!m) return { error: 'Your profile isn’t there any more' }
  const cur = parseMuted(m.noticeMuted, KNOWN)
  const next = input.muted === true ? [...new Set([...cur, event])] : cur.filter((k) => k !== event)
  /* in the events' own order, so the record reads the way the list does */
  const ordered = KNOWN.filter((k) => next.includes(k))
  await db.update(members).set({ noticeMuted: ordered.length ? JSON.stringify(ordered) : null }).where(eq(members.id, m.id))
  touch()
  return { muted: ordered }
}

/** *Send one now* — the demo's way to read the summary at once (the 8 AM one is the platform's). */
export async function sendMySummaryNow(): Promise<{ status: string; summary: SummaryView | null } | { error: string }> {
  const m = await mine()
  if (!m) return { error: 'Your profile isn’t there any more' }
  if (!m.email?.trim()) return { error: NO_EMAIL_LINE }
  const r = await sendSummaryNow(m.id)
  touch()
  return r
}
