import 'server-only'
import { and, asc, eq, gte, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, meetings } from '@/lib/db/schema'
import { visibleLeadIds } from '@/lib/leads/visibility'
import { displayDue, moneyCard, startOfDay, titleCaseName } from '@/lib/format'
import { aimLabel, firstOf, idsOf, standingOf } from '@/lib/meetings/model'
import { fetchMeetingRoom, meetingRows, nextMeetingFor } from '@/lib/meetings/queries'
import type { Prep } from '@/lib/meetings/prep'
import type { MaisonAnswer, MaisonDoor } from '@/lib/maison-ai'
import { ON_LEADS, go, plural, row, type Ctx } from './common'

/*
 * (pending modules S23 — S10's note: "a meeting's page registers its suggestions; 'prepare me for my next meeting' can answer from the records";
 * 1.0's mAIson `get_meeting_summary`) The Ask box's meetings, by rule: the viewer's next planned meeting with its prep (what is known, what is
 * still to find out, what to focus on — lib/meetings/prep.ts), and the week's meetings with the briefs waiting to be saved. Who sees leads
 * applies; Accounting runs no meetings. *(invented copy)*
 */
const DAY = 86_400_000
const title = (aim: string, client: string) => `${aim === 'other' ? 'Meeting' : aimLabel(aim)} with ${firstOf(titleCaseName(client))}`

/** The hour and minutes of a moment on the clock every page reads a meeting by (lib/format `displayTime`) — so "2 PM" in the words is the
    meeting the agenda shows at 2:00 PM. */
const clockOf = (t: number) => { const d = new Date(t); return { h: d.getHours(), m: d.getMinutes() } }
/** A time the words give — "2 PM", "2:30pm", "14:00" — as the studio's hour and minutes, or null. */
function timeIn(question: string): { h: number; m: number } | null {
  const t = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(question) ?? /\b([01]?\d|2[0-3]):(\d{2})\b/.exec(question)
  if (!t) return null
  let h = Number(t[1]); const m = Number(t[2] ?? 0)
  const ap = t[3]?.toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return h <= 23 && m <= 59 ? { h, m } : null
}
type Picked = { row: { id: string; leadId: string; leadName: string; aim: string; startsAt: number; whereKind: string; place: string | null }; prep: Prep }

/** (the Dashboard redesigned 2026-10-26, lane D4 — "Prepare me for 2 PM with Kelvin" · Your day's "Prepare me for my meeting with Kelvin at
    2:00 PM") The planned meeting the words name — its client's first name, its time today, or both — among the ones ahead that this viewer is
    on or planned (D5's rule for "your" meeting, P-14) on leads they see; null when the words name none. */
async function meetingNamed(c: Ctx, question: string): Promise<Picked | null> {
  const at = timeIn(question)
  const q = ` ${question.toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `
  const seen = await visibleLeadIds(c.viewer)
  const ahead = (await db.select({ m: meetings, name: leads.name }).from(meetings).innerJoin(leads, eq(leads.id, meetings.leadId))
    .where(and(isNull(meetings.deletedAt), isNull(leads.deletedAt), eq(meetings.status, 'planned'), gte(meetings.startsAt, new Date(c.now - 30 * 60_000)))).orderBy(asc(meetings.startsAt)))
    .filter((r) => (!seen || seen.has(r.m.leadId)) && (idsOf(r.m.memberIds).includes(c.viewer.id) || r.m.createdBy === c.viewer.id))
  const byName = (r: (typeof ahead)[number]) => { const w = r.name.toLowerCase().split(/\s+/).filter(Boolean); return !!w[0] && w[0].length >= 3 && (q.includes(` ${w[0]} `) || q.includes(` ${w.join(' ')} `)) }
  const today = (r: (typeof ahead)[number]) => startOfDay(r.m.startsAt) === startOfDay(new Date(c.now))
  const byTime = (r: (typeof ahead)[number]) => { if (!at) return false; const k = clockOf(r.m.startsAt.getTime()); return k.h === at.h && k.m === at.m && today(r) }
  const anyName = ahead.some(byName)
  const named = at ? ahead.filter((r) => byTime(r) && (!anyName || byName(r))) : ahead.filter(byName)
  if (!named.length) return null
  const mine = named[0]!
  const room = await fetchMeetingRoom(mine.m.id)
  return room ? { row: { id: mine.m.id, leadId: mine.m.leadId, leadName: mine.name, aim: mine.m.aim, startsAt: mine.m.startsAt.getTime(), whereKind: mine.m.whereKind, place: mine.m.place }, prep: room.prep } : null
}

/** (the Dashboard redesigned 2026-10-26, P-10 — the drawn "Prepare me" card) The meeting's prep as the client's record card — who, their home,
    their budget and where they came from; what is known, what to focus on, what is still to find out — then Call now, the lead and the meeting.
    The question may name the meeting ("Prepare me for 2 PM with Kelvin"); else it is the viewer's next one. */
export async function nextMeetingAnswer(c: Ctx, question = ''): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'No meetings for Accounting', text: ON_LEADS }
  /* the meeting the words name ("Prepare me for my meeting with Kelvin at 2:00 PM" — Your day's Prepare me, the docked field's suggestion), else
     the viewer's next — (the Dashboard redesigned, 2026-10-26 — P-14) both one the viewer is on or planned, never someone else's */
  const named = await meetingNamed(c, question)
  const next: Picked | null = named ?? (await nextMeetingFor(c.viewer, c.now))
  if (!next) return { title: 'No meeting planned for you', text: 'Plan one from a lead’s Meetings — the co-pilot prepares you for it here.', link: { label: 'Open Meetings', href: go(c, '/meetings') } }
  const { row: m, prep } = next
  const [l] = await db.select({ phone: leads.phone, propertyType: leads.propertyType, budgetMinor: leads.budgetMinor, source: leads.source }).from(leads).where(eq(leads.id, m.leadId)).limit(1)
  const name = titleCaseName(m.leadName)
  const first = firstOf(name)
  const digits = (l?.phone ?? '').replace(/\D/g, '').slice(-8)
  const doors: MaisonDoor[] = [
    ...(digits.length === 8 ? [{ label: 'Call now', href: `tel:+65${digits}`, channel: 'call' as const, testId: 'door-call' }] : []),
    { label: `Open ${first}’s lead`, href: go(c, `/leads/${m.leadId}`), testId: 'door-lead' },
    { label: 'Open the meeting', href: go(c, `/meetings/${m.id}`), testId: 'door-meeting' },
  ]
  return {
    title: `${named ? 'Your meeting' : 'Your next meeting'}: ${title(m.aim, m.leadName)}`,
    text: `${displayDue(new Date(m.startsAt))} · ${m.whereKind}${m.place ? ` · ${m.place}` : ''}.`,
    record: {
      kind: 'lead', name,
      line: [l?.propertyType, l && l.budgetMinor > 0 ? moneyCard(l.budgetMinor) : null, l?.source].filter(Boolean).join(' · ') || undefined,
      facts: prep.know.filter((k) => k.label !== 'Budget').map((k) => ({ label: k.label, value: k.value })),
      points: [...prep.focus, ...(prep.temperature ? [`Last time: ${prep.temperature.score} · ${prep.temperature.tier} — ${prep.temperature.line}`] : [])],
      ...(prep.unknown.length ? { note: `Still to find out: ${prep.unknown.join(', ').toLowerCase()}.` } : {}),
    },
    doors,
    chips: [`Draft a WhatsApp to ${first}`, `${first}’s budget vs similar leads`],
  }
}

export async function meetingsAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'No meetings for Accounting', text: ON_LEADS }
  const seen = await visibleLeadIds(c.viewer)
  const all = (await meetingRows(seen ? [...seen] : null)).filter((r) => !r.fromLog)
  const s = question.toLowerCase()
  const today = startOfDay(new Date(c.now))
  const window = /\btoday\b/.test(s) ? [today, today + DAY] : /\btomorrow\b/.test(s) ? [today + DAY, today + 2 * DAY] : [today, today + 8 * DAY]
  const ahead = all.filter((r) => r.status === 'planned' && r.startsAt >= window[0]! && r.startsAt < window[1]!).sort((a, b) => a.startsAt - b.startsAt)
  const toSave = all.filter((r) => standingOf(r, c.now).waits === 'save')
  const toWrite = all.filter((r) => standingOf(r, c.now).waits === 'write')
  const when = /\btoday\b/.test(s) ? 'today' : /\btomorrow\b/.test(s) ? 'tomorrow' : 'this week'
  const rows = [
    ...ahead.map((r) => row(c, r.id, title(r.aim, r.leadName), `${displayDue(new Date(r.startsAt))} · ${r.whereKind}`, `/meetings/${r.id}`)),
    ...toSave.map((r) => row(c, `s-${r.id}`, title(r.aim, r.leadName), 'Brief to save to the lead', `/meetings/${r.id}`)),
    ...toWrite.map((r) => row(c, `w-${r.id}`, title(r.aim, r.leadName), 'Its notes aren’t in yet', `/meetings/${r.id}`)),
  ].slice(0, 10)
  const head = ahead.length ? `${plural(ahead.length, 'meeting')} ${when}` : `No meeting planned ${when}`
  const waits = [toSave.length ? plural(toSave.length, 'brief') + ' to save' : null, toWrite.length ? plural(toWrite.length, 'meeting') + ' to write up' : null].filter(Boolean).join(' · ')
  return { title: head, text: waits ? `And ${waits}.` : ahead.length ? 'Open one for its prep.' : 'Plan one from a lead’s Meetings.', rows, link: { label: 'Open Meetings', href: go(c, '/meetings') } }
}
