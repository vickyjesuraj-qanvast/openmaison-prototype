'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hangoutDesigners, hangoutEvents, hangoutMeetings, hangoutParticipations, hangoutRegistrations, hangoutShifts, members } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { isSgMobile, phoneDigits, titleCaseName } from '@/lib/format'
import { bookChat, sendOwnLink } from '@/lib/hangouts/capture'
import { isStudioVisit } from '@/lib/auth/studio-visit'   // (S42F — B-02's sibling)
import { hangoutHref, hangoutOwnPath, isEventDay, isToken, midnightOf, parseHomeownerPrefs, phaseOf, type HomeownerPrefs } from '@/lib/hangouts/model'

/*
 * (pending modules S27 — Hangouts) What a homeowner does on the studio's Hangout page — book a chat, and on the day say they're at the table
 * (1.0's "I'm Ready"). No sign-in: the page's token is the permission to book, the booking's own token the permission to see and start its
 * chats (1.0's SMS code is the developers', with sign-in — S30). Every refusal answers `{ error }` in words a homeowner reads.
 */

type Err = { error: string }
const NOT_OPEN = 'Bookings for this Hangout have closed'
const ids = (v: string | null | undefined): string[] => { try { const a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }

async function pageOf(token: unknown) {
  if (!isToken(token)) return null
  const [p] = await db.select().from(hangoutParticipations).where(eq(hangoutParticipations.pageToken, token)).limit(1)
  if (!p || p.status !== 'confirmed') return null
  const [e] = await db.select().from(hangoutEvents).where(eq(hangoutEvents.id, p.eventId)).limit(1)
  return e ? { p, e } : null
}

export type BookInput = { name: string; phone: string; email?: string; shiftId: string; prefs: HomeownerPrefs; consent: boolean }

/** Book a chat with the studio at its Hangout. A number already booked here gets its own page back (and its link again); every new booking is
    the studio's lead, and their link goes to them by WhatsApp and email. */
export async function bookHangoutChat(token: string, input: BookInput): Promise<{ path: string; again: boolean } | Err> {
  const got = await pageOf(token)
  if (!got) return { error: 'This page no longer takes bookings' }
  const { p, e } = got
  const phase = phaseOf({ startsOn: e.startsOn.getTime(), dayCount: e.dayCount, startTime: e.startTime, endTime: e.endTime, feedStatus: e.feedStatus }, Date.now())
  if (p.pageClosedAt || phase === 'ended' || phase === 'cancelled') return { error: NOT_OPEN }
  const name = titleCaseName(input?.name ?? '').slice(0, 80)
  if (!name) return { error: 'Tell us your name' }
  const phone = phoneDigits(input?.phone ?? '')
  if (!isSgMobile(phone)) return { error: 'Enter a Singapore mobile number — 8 or 9 first' }
  const email = (input?.email ?? '').trim().toLowerCase().slice(0, 120) || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email doesn’t look right' }
  if (!input?.consent) return { error: 'Tick the box to let the studio contact you' }
  const [s] = await db.select().from(hangoutShifts).where(and(eq(hangoutShifts.id, input?.shiftId ?? ''), eq(hangoutShifts.eventId, e.id))).limit(1)
  if (!s) return { error: 'Pick when you’ll come' }
  if (s.dayAt.getTime() < midnightOf(Date.now())) return { error: 'That day has passed — pick another' }
  const plan = await db.select({ shiftIds: hangoutDesigners.shiftIds }).from(hangoutDesigners).where(eq(hangoutDesigners.eventId, e.id))
  if (!plan.some((d) => ids(d.shiftIds).includes(s.id))) return { error: 'Nobody from the studio is there then — pick another time' }
  const prefs = parseHomeownerPrefs(input?.prefs)
  if (!prefs.propertyType) return { error: 'Tell us about your home' }
  const b = await bookChat(e, { name, phone, email, prefs, shift: s, via: 'page', by: null })
  if ('error' in b) return b
  const [m] = b.memberId ? await db.select({ name: members.name }).from(members).where(eq(members.id, b.memberId)).limit(1) : []
  const studio = shortStudioName((await fetchStudio()).name)
  await sendOwnLink({ regId: b.regId, pageToken: token, token: b.token, leadId: b.leadId, name, phone, email, studio, eventName: e.name, venue: e.venue, shift: s, designer: m?.name ?? null, dayCount: e.dayCount })
  if (b.fresh) {
    const runners = await db.select({ id: members.id, role: members.role, isActive: members.isActive }).from(members)
    const to = [...new Set([...(b.memberId ? [b.memberId] : []), ...runners.filter((r) => r.isActive && (r.role === 'Owner' || r.role === 'Admin')).map((r) => r.id)])]
    await notify('hangout_registered', to, { title: `${name} booked a chat at ${e.name}`, body: m ? `With ${m.name}${b.table ? ` · Table ${b.table}` : ''}` : 'Nobody is on that shift yet', href: hangoutHref(e.id, 'meetings'), leadId: b.leadId, actorId: null })
  }
  return { path: hangoutOwnPath(token, b.token), again: !b.fresh }
}

/** "I'm at the table" (1.0's "I'm Ready"): the homeowner starts their chat on the day — once their designer is set and neither is in another. */
export async function readyAtTable(token: string, reg: string, meetingId: string): Promise<{ ok: true } | Err> {
  const got = await pageOf(token)
  if (!got || !isToken(reg)) return { error: 'This page is no longer active' }
  const { e } = got
  const [r] = await db.select().from(hangoutRegistrations).where(and(eq(hangoutRegistrations.token, reg), eq(hangoutRegistrations.eventId, e.id))).limit(1)
  if (!r) return { error: 'This page is no longer active' }
  const [m] = await db.select().from(hangoutMeetings).where(and(eq(hangoutMeetings.id, meetingId ?? ''), eq(hangoutMeetings.registrationId, r.id), isNull(hangoutMeetings.cancelledAt))).limit(1)
  if (!m) return { error: 'This chat was cancelled — ask at the studio’s table' }
  if (m.status !== 'scheduled') return m.status === 'in-progress' ? { ok: true } : { error: 'This chat is over' }
  if (!isEventDay({ startsOn: e.startsOn.getTime(), dayCount: e.dayCount }, Date.now())) return { error: 'Come back on the day of the Hangout' }
  const [s] = m.shiftId ? await db.select().from(hangoutShifts).where(eq(hangoutShifts.id, m.shiftId)).limit(1) : []
  if (s && s.dayAt.getTime() !== midnightOf(Date.now())) return { error: 'Your chat is on another day' }
  if (!m.memberId) return { error: 'Your designer will be with you soon' }
  const busy = await db.select({ memberId: hangoutMeetings.memberId, registrationId: hangoutMeetings.registrationId }).from(hangoutMeetings).where(and(eq(hangoutMeetings.eventId, e.id), eq(hangoutMeetings.status, 'in-progress')))
  if (busy.some((b) => b.registrationId === r.id)) return { error: 'You’re in another chat right now' }
  if (busy.some((b) => b.memberId === m.memberId)) return { error: 'Your designer is finishing another chat — they’ll be with you soon' }
  const t = new Date()
  await db.update(hangoutMeetings).set({ status: 'in-progress', startedAt: t, startedBy: 'client', updatedAt: t }).where(and(eq(hangoutMeetings.id, m.id), eq(hangoutMeetings.status, 'scheduled')))
  return { ok: true }
}

/** The booking page's first open in a browser (never a chat app fetching the link for its card). (S42F, B-02's sibling) The studio opening a
    homeowner's own page in its own browser is never theirs (`isStudioVisit`). */
export async function recordHangoutView(token: string, reg: string): Promise<void> {
  if (await isStudioVisit()) return
  const got = await pageOf(token)
  if (!got || !isToken(reg)) return
  await db.update(hangoutRegistrations).set({ viewedAt: new Date() }).where(and(eq(hangoutRegistrations.token, reg), eq(hangoutRegistrations.eventId, got.e.id), isNull(hangoutRegistrations.viewedAt)))
}
