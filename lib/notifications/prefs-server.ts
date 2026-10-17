import 'server-only'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { EVENTS, type EventKey } from '@/lib/notifications/model'
import { emailModeOf, parseMuted, type EmailMode } from '@/lib/notifications/personal'

/* (pending modules S18) Each member's own choices, as the senders read them: `notify` leaves a muted member out, the delivery layer keeps a
   summary member's non-urgent emails for their summary, the bell leaves their muted reminders out. One read for the members a notice is for. */

export type NoticePrefs = { email: EmailMode; muted: ReadonlySet<EventKey> }
const KNOWN = EVENTS.map((e) => e.key)
export const prefsOf = (row: { noticeEmail: string | null; noticeMuted: string | null }): NoticePrefs => ({ email: emailModeOf(row.noticeEmail), muted: new Set(parseMuted(row.noticeMuted, KNOWN)) })
export const NO_PREFS: NoticePrefs = { email: 'each', muted: new Set() }

export async function noticePrefsOf(memberIds: readonly string[]): Promise<Map<string, NoticePrefs>> {
  const ids = [...new Set(memberIds.filter(Boolean))]
  if (!ids.length) return new Map()
  const rows = await db.select({ id: members.id, noticeEmail: members.noticeEmail, noticeMuted: members.noticeMuted }).from(members).where(inArray(members.id, ids))
  return new Map(rows.map((r) => [r.id, prefsOf(r)]))
}
