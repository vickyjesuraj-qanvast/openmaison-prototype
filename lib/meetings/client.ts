import 'server-only'   // libSQL never reaches the browser
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, meetings, members, type Meeting } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { leadClosed } from '@/lib/visualizer/queries'
import { chipCss, styleBoard } from '@/lib/visualizer/materials'
import { styleByName } from '@/lib/visualizer/styles'
import { shortStudioName } from '@/lib/settings/types'
import { displayDateLong, moneyCard, phoneDigits, titleCaseName } from '@/lib/format'
import { clientNotesOf } from '@/components/meetings/client/client-notes'
import { DEFAULT_LENGTH_MIN, LINK_DAYS, aimLabel, clientMeetingPath, firstOf, idsOf, parseBrief, parseShare, parseState } from './model'
import { calendarTitle, placeWords, whenWords } from './words'
import { googleCalendarUrl, type CalendarEvent } from './calendar'

/*
 * (pending modules S23 — Meetings and the Meeting Co-Pilot; the held card's "the client's meeting email" and 1.0's 24-hour share links,
 * `/copilot/share/<id>`) The client's meeting link, `/meeting/<token>`: the invitation before the meeting, the notes after it — only once the
 * studio shares them. The token is the permission: no session, nothing about the lead but the client's first name, nothing of the meeting
 * the page does not draw (S04's rule: one projection — the page, its preview card and the calendar file read only this). The deal score, its
 * dimensions, the objections, the competitors, the tags, the add-ons, the notes and transcript, the members' own things never leave here.
 * The link opens until LINK_DAYS after the meeting (or after its notes were shared, when that came later); then, like a link to a deleted meeting or a returned or deleted lead, it is the house
 * closed notice. Every word below is invented copy unless it is the house's (pending modules S23) (invented copy).
 */

const DAY_MS = 86_400_000

/** A token as an address may carry it — 2.0's own (24 characters) or one a port carries over from 1.0's share links; anything else is never looked up. */
export const isMeetingToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(t)

/** Where the page stands: before (no answer yet), answered, after it, cancelled — or closed (unknown, deleted, its lead gone, past the window). */
export type MeetingLinkState = 'upcoming' | 'answered' | 'held' | 'cancelled' | 'closed'

/** When the meeting ends — its own end, else the planned hour. */
export const endOf = (m: Pick<Meeting, 'startsAt' | 'endsAt'>) => m.endsAt?.getTime() ?? m.startsAt.getTime() + DEFAULT_LENGTH_MIN * 60_000

/**
 * The page's state from the record. A planned meeting whose time has passed reads as held (the studio writes it up later) — unless the client
 * said the time didn't suit: then the page keeps what they told the studio. A live meeting past its end is held too.
 */
export function linkStateOf(m: Pick<Meeting, 'status' | 'startsAt' | 'endsAt' | 'clientAnswer' | 'deletedAt'> & { sharedAt?: Date | null; shareStoppedAt?: Date | null }, now: number): MeetingLinkState {
  if (m.deletedAt) return 'closed'
  const end = endOf(m)
  /* the window runs from the meeting's end — or from the day its notes were shared, when that came later: notes shared weeks after a
     meeting are never closed on arrival */
  const shared = m.sharedAt && !m.shareStoppedAt ? m.sharedAt.getTime() : 0
  if (now > Math.max(end, shared) + LINK_DAYS * DAY_MS) return 'closed'
  if (m.status === 'cancelled') return 'cancelled'
  if (m.status === 'held' || (now >= end && (m.status === 'live' || m.clientAnswer !== 'no'))) return 'held'
  return m.clientAnswer === 'yes' || m.clientAnswer === 'no' ? 'answered' : 'upcoming'
}
/** The invitation can still be answered: planned, and its time is still ahead. */
export const answerableOf = (m: Pick<Meeting, 'status' | 'startsAt'>, now: number) => m.status === 'planned' && m.startsAt.getTime() > now

/** The meeting a token opens, with its lead's name — null when the token names none, or its lead was returned or deleted. */
export async function meetingByToken(token: string): Promise<{ m: Meeting; leadName: string } | null> {
  if (!isMeetingToken(token)) return null
  const [row] = await db.select({ m: meetings, leadName: leads.name }).from(meetings).innerJoin(leads, eq(leads.id, meetings.leadId)).where(and(eq(meetings.clientToken, token), isNull(meetings.deletedAt))).limit(1)
  if (!row) return null
  if (await leadClosed(row.m.leadId)) return null
  return row
}

/** The meeting's words: "first consultation" — "meeting" for Other. */
export const aimWords = (aim: string) => (aim === 'other' ? 'meeting' : aimLabel(aim).toLowerCase())

export type ClientWhere = {
  /** the glyph and the line's first words: at the client's home or a place, at the showroom, or a video call */
  kind: 'place' | 'showroom' | 'video'
  label: string
  /** the address or the call's link, as the studio typed it */
  place: string | null
  /** an address opens Google Maps; a call's web link opens itself — never anything but http(s) */
  href: string | null
}
/** A mood board, as the AI Visualizer's style card draws it: the style's five colours, its name and line, and the materials its board picks. */
export type ClientBoard = { name: string; line: string; palette: string[]; materials: { name: string; css: string }[] }
export type ClientNotes = {
  summary: string
  next: string[]
  /** "S$ 45,000 – S$ 62,000" and the works it prices — only when the studio ticked it */
  estimate: { range: string; lines: string[] } | null
  boards: ClientBoard[]
}
/** "Message {name}" — WhatsApp to whoever meets them (the meeting's first member with a number), else the studio's own number. */
export type ClientContact = { name: string; to: string; text: string }

export type ClientMeeting = {
  token: string
  /** the bar's name and mark */
  studio: string
  logo: string | null
  state: MeetingLinkState
  /** the studio's name in the page's sentences ("Demo Studio") */
  name: string
  /** "First consultation with Demo Studio" — the card's and the calendar's title */
  title: string | null
  /** "Your first consultation with Demo Studio" */
  heading: string | null
  /** "first consultation" */
  aim: string | null
  /** "Wed, 14 Oct ’26 at 3:00 PM" */
  when: string | null
  /** "Wed, 14 Oct ’26" */
  date: string | null
  where: ClientWhere | null
  /** Google Calendar's own filled-in page, and the invite file — while the meeting is still ahead (the page shows them unless the answer is no) */
  calendar: { google: string; ics: string } | null
  answer: 'yes' | 'no' | null
  answerNote: string | null
  answerable: boolean
  contact: ClientContact | null
  /** only when shared (and not stopped) on a held meeting with a brief */
  notes: ClientNotes | null
}

const isWeb = (s: string) => /^https?:\/\/[^\s]+$/i.test(s)
/** A call's link as the studio typed it: "https://meet.google.com/…" as it is, "meet.google.com/…" given its https — anything else stays words. */
function callHref(place: string): string | null {
  if (isWeb(place)) return place
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(place)) return `https://${place}`
  return null
}
const mapsHref = (place: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
export function whereOf(kind: string, place: string | null): ClientWhere {
  const p = place?.replace(/\s+/g, ' ').trim() || null
  if (kind === 'Video call') return { kind: 'video', label: 'Video call', place: p, href: p ? callHref(p) : null }
  if (kind === 'Showroom') return { kind: 'showroom', label: 'At the showroom', place: p, href: p ? mapsHref(p) : null }
  return { kind: 'place', label: 'In person', place: p, href: p ? mapsHref(p) : null }
}

/** The meeting as a calendar event — the same for Google's page and the invite file. `link` = the page's own address, when the caller knows its origin. */
export function calendarEventOf(o: { token: string; aim: string; studio: string; startsAt: number; endsAt: number; whereKind: string; place: string | null; link?: string | null }): CalendarEvent {
  const title = calendarTitle({ aim: o.aim, with: o.studio })
  const line = `${whenWords(o.startsAt)}, ${placeWords(o.whereKind, o.place)}`
  return { uid: `${o.token}@meeting`, title, startsAt: o.startsAt, endsAt: o.endsAt, location: o.place, description: line.replace(/^./, (c) => c.toUpperCase()), url: o.link ?? null }
}

function boardOf(style: string): ClientBoard | null {
  const s = styleByName(style)
  if (!s) return null
  return { name: s.name, line: s.description, palette: s.colorPalette.slice(0, 5), materials: styleBoard(s.name).map((m) => ({ name: m.name, css: chipCss(m) })) }
}

/** Whom "Message …" writes to: the first of the meeting's people with a number, else the studio. wa.me wants the country code. */
async function contactOf(m: Meeting, studio: { name: string; phone: string }, words: { client: string; aim: string; date: string; after: boolean }): Promise<ClientContact | null> {
  const ids = idsOf(m.memberIds)
  const team = ids.length ? await db.select({ id: members.id, name: members.name, phone: members.phone, active: members.isActive }).from(members).where(inArray(members.id, ids)) : []
  const person = ids.map((id) => team.find((t) => t.id === id)).find((t) => !!t && t.active !== false && phoneDigits(t.phone).length >= 8) ?? null
  const digits = phoneDigits(person?.phone ?? studio.phone)
  if (digits.length < 8) return null
  const to = digits.length === 8 ? `65${digits}` : digits
  const name = person ? firstOf(person.name) : studio.name
  const text = words.after
    ? `Hi ${name}, it’s ${words.client} — about the notes from our meeting on ${words.date}. `
    : `Hi ${name}, it’s ${words.client} about our ${words.aim} on ${words.date}. `
  return { name, to, text }
}

/**
 * Everything `/meeting/<token>` shows, and nothing it does not. `origin` (the address the link was opened on) puts the page's own link in the
 * calendar event's description; the preview card passes none. Never stamps Viewed — that is the page's first browser ask (`recordMeetingView`).
 */
export async function fetchClientMeeting(token: string, o: { origin?: string | null; now?: number } = {}): Promise<ClientMeeting> {
  const now = o.now ?? Date.now()
  const [hit, brand] = await Promise.all([meetingByToken(token), fetchBrand()])
  const full = brand.details.name || 'Your studio'
  const base = {
    token, studio: full, logo: brand.kit.logo ?? null, name: shortStudioName(full),
    title: null, heading: null, aim: null, when: null, date: null, where: null, calendar: null, answer: null, answerNote: null, answerable: false, contact: null, notes: null,
  } satisfies Omit<ClientMeeting, 'state'>
  if (!hit) return { ...base, state: 'closed' }
  const { m, leadName } = hit
  const state = linkStateOf(m, now)
  if (state === 'closed') return { ...base, state }
  if (state === 'cancelled') return { ...base, state }
  const startsAt = m.startsAt.getTime()
  const aim = aimWords(m.aim)
  const date = displayDateLong(m.startsAt)
  const title = calendarTitle({ aim: m.aim, with: base.name })
  const client = firstOf(titleCaseName(leadName))
  const studioContact = { name: base.name, phone: brand.details.phone ?? '' }

  if (state === 'held') {
    const shared = m.status === 'held' && !!m.sharedAt && !m.shareStoppedAt ? parseBrief(m.briefJson) : null
    if (!shared) return { ...base, state, title, date }   // "Thank you for meeting us on …" and nothing else
    const share = parseShare(m.shareJson)
    const words = clientNotesOf(shared, client)   // (S42 C-01 · C-05) said to the client: "we / your", only what the studio will do for them
    const est = shared.estimate
    const estimate = share.estimate && est && Array.isArray(est.lines) && est.lines.length && est.highMinor > 0
      ? { range: est.lowMinor === est.highMinor ? moneyCard(est.lowMinor) : `${moneyCard(est.lowMinor)} – ${moneyCard(est.highMinor)}`, lines: est.lines.map((l) => l.name).filter(Boolean).slice(0, 20) }
      : null
    const boards = share.boards ? parseState(m.stateJson).boards.map(boardOf).filter((b): b is ClientBoard => !!b) : []
    return {
      ...base, state, title, date,
      contact: await contactOf(m, studioContact, { client, aim, date, after: true }),
      notes: { summary: words.summary, next: words.next, estimate, boards },
    }
  }

  /* before it: the invitation */
  const answer = m.clientAnswer === 'yes' || m.clientAnswer === 'no' ? m.clientAnswer : null
  const ahead = now < endOf(m)
  const link = o.origin ? `${o.origin.replace(/\/$/, '')}${clientMeetingPath(token)}` : null
  const event = calendarEventOf({ token, aim: m.aim, studio: base.name, startsAt, endsAt: endOf(m), whereKind: m.whereKind, place: m.place, link })
  return {
    ...base, state, title, date, aim,
    heading: `Your ${aim} with ${base.name}`,
    when: whenWords(startsAt),
    where: whereOf(m.whereKind, m.place),
    /* while the meeting is ahead; the page leaves it out while the answer is no (an answer changed back brings it) */
    calendar: ahead ? { google: googleCalendarUrl(event), ics: `${clientMeetingPath(token)}/invite.ics` } : null,
    answer, answerNote: answer === 'no' ? m.clientAnswerNote?.trim() || null : null,
    answerable: answerableOf(m, now),
    contact: await contactOf(m, studioContact, { client, aim, date, after: false }),
  }
}

/** The invite file's event — the same event Google's page is filled with; null when the invitation no longer applies (closed, cancelled, past). */
export async function fetchMeetingInvite(token: string, origin: string | null, now = Date.now()): Promise<CalendarEvent | null> {
  const hit = await meetingByToken(token)
  if (!hit) return null
  const { m } = hit
  const state = linkStateOf(m, now)
  if (state !== 'upcoming' && state !== 'answered') return null
  if (now >= endOf(m)) return null
  const brand = await fetchBrand()
  const studio = shortStudioName(brand.details.name || 'Your studio')
  const link = origin ? `${origin.replace(/\/$/, '')}${clientMeetingPath(token)}` : null
  return calendarEventOf({ token, aim: m.aim, studio, startsAt: m.startsAt.getTime(), endsAt: endOf(m), whereKind: m.whereKind, place: m.place, link })
}
