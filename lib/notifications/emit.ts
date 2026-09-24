import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { channelsOf, fetchNotificationRules } from '@/lib/notifications/queries'
import type { EventKey } from '@/lib/notifications/model'

/**
 * (REG-604) Raise an event for a set of members: one row each, on the channels the rules keep on for that event (in-app
 * is the row itself; email and WhatsApp are the platform's sends, recorded so the feed can say "also by WhatsApp"). The
 * actor never notifies themselves. Nothing happens when in-app is off for the event.
 */
export async function notify(kind: EventKey, memberIds: string[], o: { title: string; body?: string | null; href?: string | null; leadId?: string | null; quoteId?: string | null; actorId?: string | null }): Promise<number> {
  const rules = await fetchNotificationRules()
  const channels = channelsOf(rules, kind)
  if (!channels.includes('in_app')) return 0
  const actor = o.actorId === undefined ? SESSION_MEMBER_ID : o.actorId
  const targets = [...new Set(memberIds)].filter((id) => id && id !== actor)
  if (!targets.length) return 0
  const now = new Date()
  await db.insert(notifications).values(targets.map((memberId) => ({ id: randomUUID(), memberId, kind, title: o.title, body: o.body ?? null, href: o.href ?? null, leadId: o.leadId ?? null, quoteId: o.quoteId ?? null, channels: channels.join(','), actorId: actor, createdAt: now, readAt: null })))
  return targets.length
}
