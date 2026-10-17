import 'server-only'
import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, notificationOutbox } from '@/lib/db/schema'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { fetchFeed } from '@/lib/notifications/queries'
import { absoluteLink, deliver, type DeliveryStatus } from '@/lib/notifications/delivery'
import { noticePrefsOf } from '@/lib/notifications/prefs-server'
import { SUMMARY_HOUR } from '@/lib/notifications/personal'
import { FIRST_LOOK_BACK_MS, SUMMARY_EVENT, composeSummary, dayKey, isEmpty, summaryKey, summaryParts } from '@/lib/notifications/summary'

/*
 * (pending modules S18 — card held:notifications; 1.0's GET /api/cron/notification-digest, hourly, which sent each studio's digests at 8 AM its
 * time) Writing a member's daily summary. Built from their own bell (`fetchFeed` — the same rows, the same mute), it goes through the one
 * delivery layer (`deliver`: the adapter, OpenMaison's pause, the retries, "No email address"), keyed once per member per day
 * (`s:<member>:<day>`), and Settings › Notifications › Sent messages lists it. 1.0 sent the digest only when something was unread; so here —
 * nothing new and nothing due, no email.
 *
 * WHEN: the prototype has no scheduler, so `sendDueSummaries` runs lazily — on the bell's read, on Sent messages' read and on Your profile's —
 * from 8 AM, for every member who chose the summary and hasn't had today's (the honest stand-in for 1.0's cron; the record says when it went).
 * PRODUCTION: the sweep the developers run for the delivery layer (the five-minute one that runs `deliverDerived` and `releaseHeldMessages`)
 * calls `sendDueSummaries()` too. *Send one now* on Your profile (`sendSummaryNow`) is the demo's way to read one at once.
 */

type Member = { id: string; name: string; role: string; email: string | null }

/** A summary as Your profile shows it — the outbox row, as the member reads it. */
export type SummaryView = { id: string; at: number; subject: string | null; body: string; toName: string; toAddress: string | null; status: string; sendAfter: number | null }
const view = (r: typeof notificationOutbox.$inferSelect): SummaryView => ({ id: r.id, at: r.createdAt.getTime(), subject: r.subject, body: r.body, toName: r.toName, toAddress: r.toAddress, status: r.status, sendAfter: r.sendAfter?.getTime() ?? null })

async function lastRow(memberId: string) {
  const [r] = await db.select().from(notificationOutbox).where(and(eq(notificationOutbox.memberId, memberId), eq(notificationOutbox.event, SUMMARY_EVENT))).orderBy(desc(notificationOutbox.createdAt)).limit(1)
  return r ?? null
}
/** The member's latest summary, or null when they have had none. */
export async function lastSummaryOf(memberId: string): Promise<SummaryView | null> {
  const r = await lastRow(memberId)
  return r ? view(r) : null
}

/** Write one summary for one member now, under `key`. 'nothing' = no unread notice since their last summary and nothing due — no email. */
async function writeSummary(m: Member, now: Date, key: string): Promise<DeliveryStatus | 'duplicate' | 'held' | 'nothing'> {
  const [feed, last, studio, prefs] = await Promise.all([fetchFeed(m.id, m.role), lastRow(m.id), fetchStudio(), noticePrefsOf([m.id])])
  const since = last ? last.createdAt.getTime() : now.getTime() - FIRST_LOOK_BACK_MS
  const parts = summaryParts(feed.rows, since, prefs.get(m.id)?.muted ?? new Set())
  if (isEmpty(parts)) return 'nothing'
  const msg = composeSummary({ member: m.name, studio: shortStudioName(studio.name), parts, since: last ? since : null, now: now.getTime(), link: absoluteLink, settings: absoluteLink('/profile#notifications') })
  return deliver({ key, event: SUMMARY_EVENT, channel: 'email', to: { memberId: m.id, name: m.name, email: m.email, phone: null }, subject: msg.subject, body: msg.body, href: '/profile#notifications', leadId: null, notificationId: null })
}

/* the members already looked at today — one look a day each (1.0's cron looked once, at 8), keyed with the moment they chose the summary, so a
   member who chooses again is looked at again (as `forgetSummaryLook` does for a choice made here) */
const looked = new Set<string>()
let running = false
const lookKey = (id: string, day: string, since: Date | null) => `${id}|${day}|${since?.getTime() ?? 0}`
export function forgetSummaryLook(memberId: string): void { for (const k of [...looked]) if (k.startsWith(`${memberId}|`)) looked.delete(k) }

/** Every summary due now — from 8 AM, once a day, for each active member who chose it. Answers how many went. Never throws. */
export async function sendDueSummaries(now: Date = new Date()): Promise<number> {
  if (running || now.getHours() < SUMMARY_HOUR) return 0
  running = true
  try {
    const day = dayKey(now)
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const eight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), SUMMARY_HOUR)
    /* the first summary goes at the next 8 AM after the member chose it — never on the switch itself */
    const list = (await db.select({ id: members.id, name: members.name, role: members.role, email: members.email, since: members.noticeEmailAt }).from(members).where(and(eq(members.noticeEmail, 'daily'), eq(members.isActive, true))))
      .filter((m) => !looked.has(lookKey(m.id, day, m.since)) && (!m.since || m.since.getTime() < eight.getTime()))
    if (!list.length) return 0
    const had = new Set((await db.select({ memberId: notificationOutbox.memberId }).from(notificationOutbox)
      .where(and(eq(notificationOutbox.event, SUMMARY_EVENT), gte(notificationOutbox.createdAt, start), inArray(notificationOutbox.memberId, list.map((m) => m.id))))).map((r) => r.memberId))
    let sent = 0
    for (const m of list) {
      looked.add(lookKey(m.id, day, m.since))
      if (had.has(m.id)) continue   // today's went already (or one sent by hand this morning)
      try { if ((await writeSummary(m, now, summaryKey(m.id, day))) === 'sent') sent++ } catch (e) { console.error(`[summary] ${m.name}’s wasn’t written:`, e instanceof Error ? e.message : e) }
    }
    return sent
  } catch { return 0 } finally { running = false }
}

/** *Send one now* (Your profile) — the member's summary at once: today's, or another after it the same day. */
export async function sendSummaryNow(memberId: string, now: Date = new Date()): Promise<{ status: DeliveryStatus | 'duplicate' | 'held' | 'nothing'; summary: SummaryView | null }> {
  const [m] = await db.select({ id: members.id, name: members.name, role: members.role, email: members.email, since: members.noticeEmailAt }).from(members).where(eq(members.id, memberId)).limit(1)
  if (!m) return { status: 'nothing', summary: null }
  const day = dayKey(now)
  const [have] = await db.select({ id: notificationOutbox.id }).from(notificationOutbox).where(eq(notificationOutbox.key, summaryKey(m.id, day))).limit(1)
  const status = await writeSummary(m, now, have ? summaryKey(m.id, day, now.getTime()) : summaryKey(m.id, day))
  looked.add(lookKey(m.id, day, m.since))
  return { status, summary: await lastSummaryOf(m.id) }
}
