import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { channelsOf, fetchNotificationRules } from '@/lib/notifications/queries'
import { deliverNotice, type OutboundChannel } from '@/lib/notifications/delivery'
import type { EventKey } from '@/lib/notifications/model'
import { noticePrefsOf } from '@/lib/notifications/prefs-server'   // (pending modules S18) a member's own mute
import { waitsForSummary } from '@/lib/notifications/personal'

/**
 * (REG-604) Raise an event for a set of members: one row each, on the channels the rules keep on for that event (in-app
 * is the row itself). The actor never notifies themselves. Nothing happens when in-app is off for the event.
 * (gaps build E, item 5) Email and WhatsApp go out with the row through the one delivery layer (lib/notifications/delivery.ts) — the
 * studio's words for the event, filled for each member; `fields` are the sender's own values for the words' fields ({task}, {update} …),
 * read before the ones the records give. A delivery that fails never fails the action that raised the notice.
 * (pending modules S18) A member who muted the event for themselves (Your profile › Your notifications) is left out — no row, so no email and
 * no WhatsApp either; everyone else still hears it.
 */
export async function notify(kind: EventKey, memberIds: string[], o: { title: string; body?: string | null; href?: string | null; leadId?: string | null; quoteId?: string | null; actorId?: string | null; fields?: Record<string, string> }): Promise<number> {
  const rules = await fetchNotificationRules()
  const channels = channelsOf(rules, kind)
  if (!channels.includes('in_app')) return 0
  const actor = o.actorId === undefined ? await sessionMemberId() : o.actorId
  const asked = [...new Set(memberIds)].filter((id) => id && id !== actor)
  if (!asked.length) return 0
  const prefs = await noticePrefsOf(asked)
  const targets = asked.filter((id) => !prefs.get(id)?.muted.has(kind))
  if (!targets.length) return 0
  const now = new Date()
  /* (pending modules S18) a member who takes a daily summary: the row says its email waits for it ('summary' in place of 'email'), as it does */
  const channelsFor = (memberId: string) => (channels.includes('email') && waitsForSummary(prefs.get(memberId)?.email ?? 'each', kind) ? channels.map((c) => (c === 'email' ? 'summary' : c)) : channels).join(',')
  const rows = targets.map((memberId) => ({ id: randomUUID(), memberId, kind, title: o.title, body: o.body ?? null, href: o.href ?? null, leadId: o.leadId ?? null, quoteId: o.quoteId ?? null, channels: channelsFor(memberId), actorId: actor, createdAt: now, readAt: null }))
  await db.insert(notifications).values(rows)
  const out = channels.filter((c): c is OutboundChannel => c !== 'in_app')
  if (out.length) await deliverNotice(kind, out, rows.map((r) => ({ id: r.id, memberId: r.memberId })), { ...o, actorId: actor })
  return targets.length
}
