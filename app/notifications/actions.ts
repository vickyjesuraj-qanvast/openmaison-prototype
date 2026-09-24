'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, notifications, settings } from '@/lib/db/schema'
import { RULES_KEY, TEMPLATES_KEY, fetchFeed, fetchMessageTemplates, fetchNotificationRules } from '@/lib/notifications/queries'
import { parseRules, parseTemplates, type FeedRow, type MessageTemplate, type NotificationRules } from '@/lib/notifications/model'

/* (REG-604) The bell's feed and Settings › Notifications. */

async function me() {
  const [m] = await db.select({ id: members.id, role: members.role }).from(members).where(eq(members.isYou, true)).limit(1)
  return m ?? { id: 'dane', role: 'Owner' }
}
const touch = () => { revalidatePath('/leads', 'layout'); revalidatePath('/tasks'); revalidatePath('/company', 'layout'); revalidatePath('/settings'); revalidatePath('/quotes'); revalidatePath('/contracts'); revalidatePath('/quote-x-ray'); revalidatePath('/qanvast-ops') }

export async function fetchFeedAction(): Promise<{ rows: FeedRow[]; unread: number }> {
  const m = await me()
  return fetchFeed(m.id, m.role)
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
export async function setNotificationRules(patch: Partial<NotificationRules>): Promise<NotificationRules> {
  const cur = await fetchNotificationRules()
  const next = parseRules({ ...cur, ...patch, channels: { ...cur.channels, ...(patch.channels ?? {}) } })
  await db.insert(settings).values({ key: RULES_KEY, value: JSON.stringify(next), updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: new Date() } })
  touch()
  return next
}
export async function setMessageTemplate(t: MessageTemplate): Promise<MessageTemplate[]> {
  const cur = await fetchMessageTemplates()
  const next = parseTemplates(cur.map((x) => (x.event === t.event && x.channel === t.channel ? t : x)))
  await db.insert(settings).values({ key: TEMPLATES_KEY, value: JSON.stringify(next), updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: new Date() } })
  revalidatePath('/settings')
  return next
}
