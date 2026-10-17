'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, notifications, settings } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'   // (pending modules S43A) this browser's member, never the standing flag
import { RULES_KEY, TEMPLATES_KEY, fetchFeed, fetchMessageTemplates, fetchNotificationRules } from '@/lib/notifications/queries'
import { parseRules, parseTemplates, type FeedRow, type MessageTemplate, type NotificationRules } from '@/lib/notifications/model'
import { deliverDerived } from '@/lib/notifications/delivery'
import { tellPaymentsDue } from '@/lib/portal/payment-due'   // (simplify round 2, R2-D's Needs 1)
import { sendDueSummaries } from '@/lib/notifications/summary-server'   // (pending modules S18)

/* (REG-604) The bell's feed and Settings › Notifications. */

async function me() {
  const [m] = await db.select({ id: members.id, role: members.role }).from(members).where(eq(members.id, await sessionMemberId())).limit(1)
  return m ?? { id: 'dane', role: 'Owner' }
}
const touch = () => { revalidatePath('/leads', 'layout'); revalidatePath('/tasks'); revalidatePath('/company', 'layout'); revalidatePath('/settings'); revalidatePath('/quotes'); revalidatePath('/contracts'); revalidatePath('/quote-x-ray'); revalidatePath('/qanvast-ops') }

export async function fetchFeedAction(): Promise<{ rows: FeedRow[]; unread: number }> {
  const m = await me()
  const feed = await fetchFeed(m.id, m.role)
  /* (gaps build E, item 5) a reminder derived from a date goes out by email / WhatsApp once, as the member's bell lists it (PRODUCTION: a sweep) */
  await deliverDerived(m.id, feed.rows)
  /* (simplify round 2 — P3 §6.8, R2-D) the client's "A payment is due today" — once per invoice on its due day, off until switched on */
  await tellPaymentsDue()
  /* (pending modules S18) from 8 AM, the daily summaries due today go — the honest stand-in for 1.0's 8 AM cron (PRODUCTION: the sweep) */
  await sendDueSummaries()
  return feed
}
export async function markNotificationRead(id: string): Promise<void> {
  const m = await me()
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.memberId, m.id), isNull(notifications.readAt)))
  touch()
}
export async function markAllNotificationsRead(): Promise<void> {
  const m = await me()
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.memberId, m.id), isNull(notifications.readAt)))
  touch()
}
/** (REG-646, settings parity Q-07) The studio's notification rules and messages are its Owners' and Admins' to change, on the server too (E-84). */
async function assertRunsStudio(): Promise<void> {
  const m = await me()
  if (m.role !== 'Owner' && m.role !== 'Admin') throw new Error('owners and admins only')
}
export async function setNotificationRules(patch: Partial<NotificationRules>): Promise<NotificationRules> {
  /* (S44O — call C6) Lead management's Untouched leads delay is the lead set-up — Marketing changes that one rule, and only that */
  const onlyUntouched = !!patch && typeof patch === 'object' && Object.keys(patch).every((k) => k === 'untouchedMinutes')
  if (!(onlyUntouched && (await me()).role === 'Marketing')) await assertRunsStudio()
  const cur = await fetchNotificationRules()
  /* (pending modules S19 — 1.0: "PUT /api/notifications/preferences refuses turning WhatsApp on") a WhatsApp channel switched on, on Free */
  const waOn = Object.entries(patch?.channels ?? {}).some(([k, v]) => !!(v as { whatsapp?: boolean } | undefined)?.whatsapp && !cur.channels[k as keyof typeof cur.channels]?.whatsapp)
  if (waOn) { const lock = await requirePlan('whatsapp_notifications'); if (lock) throw new Error(lock.error) }
  const next = parseRules({ ...cur, ...patch, channels: { ...cur.channels, ...(patch.channels ?? {}) } })
  await db.insert(settings).values({ key: RULES_KEY, value: JSON.stringify(next), updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: new Date() } })
  touch()
  return next
}
export async function setMessageTemplate(t: MessageTemplate): Promise<MessageTemplate[]> {
  await assertRunsStudio()
  const cur = await fetchMessageTemplates()
  const next = parseTemplates(cur.map((x) => (x.event === t.event && x.channel === t.channel ? t : x)))
  await db.insert(settings).values({ key: TEMPLATES_KEY, value: JSON.stringify(next), updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: new Date() } })
  revalidatePath('/settings')
  return next
}
