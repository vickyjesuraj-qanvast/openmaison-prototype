import 'server-only'
import { after } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, meetings, members } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { serviceSlot } from '@/lib/services/slots'
import { siteConfig } from '@/lib/config'
import { endOf } from './client'
import { aimLabel } from './model'
import { placeWords } from './words'
import type { CalendarEvent } from './calendar'

/*
 * (pending modules S34 — the steps' note after S23: "Google Calendar two-way beside lib/meetings/calendar.ts") THE STUDIO'S OWN CALENDAR,
 * plugged in at one slot. The client's invitation needs no account and stays as it is (.ics + Google's page, lib/meetings/calendar.ts); this
 * is the other half 1.0's unmerged branch began — the studio's members seeing their meetings in their own Google (or any) calendar.
 *
 * The contract is ONE call, `sync(leadId, events)`: here is every meeting of this lead as the studio's calendar should hold it now — the
 * adapter makes its calendar match (adds, moves, takes away its own events for this lead that aren't in the list: a cancel, a delete, a delete
 * for good). Every write to a meeting already says which lead it touched (app/meetings/actions.ts `revalidateMeeting`, the Met log's
 * `planInPerson`), so each one queues this lead's sync after its response (`queueCalendarSync` — Next's `after`), and a slow calendar never
 * slows a press. Events carry the meeting's id (`uid` = `<id>@studio-meeting`), its members (with their emails, the invitees) and a line
 * for the description. THE STAND-IN has no calendar and does nothing — Company › Integrations says the two-way sync comes later.
 * The pull half (a meeting moved in Google moves here) is the adapter's to call into the house actions (`updateMeetingPlan`), once the
 * provider's change notices reach a route of the developers'.
 */

export type StudioCalendarEvent = CalendarEvent & { meetingId: string; leadId: string; status: 'planned' | 'live' | 'held'; members: { id: string; name: string; email: string | null }[] }
export type CalendarSync = { name: string; sync(leadId: string, events: StudioCalendarEvent[]): Promise<void> }

const NO_CALENDAR: CalendarSync = { name: 'none', sync: async () => {} }
const slot = serviceSlot<CalendarSync>('calendar', NO_CALENDAR)
/** PRODUCTION: plug the studio's calendar in once, at start-up (lib/services/install.ts). */
export function setCalendarSync(c: CalendarSync): void { slot.set(c) }
export const calendarIsStandIn = (): boolean => slot.standIn()

const ids = (raw: string): string[] => { try { const v = JSON.parse(raw) as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }

/** The lead's meetings as the studio's calendar should hold them now — every one not cancelled and not deleted. */
export async function studioEventsOf(leadId: string): Promise<StudioCalendarEvent[]> {
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) return []
  const rows = (await db.select().from(meetings).where(eq(meetings.leadId, leadId))).filter((m) => !m.deletedAt && m.status !== 'cancelled')
  const people = [...new Set(rows.flatMap((m) => ids(m.memberIds)))]
  const team = people.length ? await db.select({ id: members.id, name: members.name, email: members.email }).from(members).where(inArray(members.id, people)) : []
  const client = titleCaseName(lead.name)
  return rows.map((m) => {
    const line = `${client} — ${placeWords(m.whereKind, m.place)}${m.aimNote ? `. ${m.aimNote}` : ''}`
    return {
      uid: `${m.id}@studio-meeting`, title: `${aimLabel(m.aim)} · ${client}`, startsAt: m.startsAt.getTime(), endsAt: endOf(m), location: m.place, description: line, url: `${siteConfig.url.replace(/\/$/, '')}/meetings/${m.id}`,
      meetingId: m.id, leadId, status: m.status === 'live' || m.status === 'held' ? m.status : 'planned',
      members: ids(m.memberIds).map((id) => team.find((t) => t.id === id)).filter((t): t is { id: string; name: string; email: string | null } => !!t),
    }
  })
}

/** Bring the studio's calendar in line with one lead's meetings now. Never throws (the calendar is best-effort; the meeting is the record). */
export async function syncLeadMeetings(leadId: string): Promise<boolean> {
  if (slot.standIn() || !leadId) return false
  try { await slot.use().sync(leadId, await studioEventsOf(leadId)); return true } catch (e) { console.error('[calendar] the studio’s calendar didn’t take the change:', e instanceof Error ? e.message : e); return false }
}

/** After the response, sync this lead's meetings — the stand-in does nothing, so nothing is queued on the prototype. */
export function queueCalendarSync(leadId: string): void {
  if (slot.standIn() || !leadId) return
  try { after(() => syncLeadMeetings(leadId)) } catch { void syncLeadMeetings(leadId) }   // outside a request (a script): now
}
