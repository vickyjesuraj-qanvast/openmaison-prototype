'use server'

import { and, count, desc, eq, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, notificationOutbox } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'   // (pending modules S43A) this browser's member, never the standing flag
import { runsStudio } from '@/lib/leads/assign-policy'
import { EVENTS } from '@/lib/notifications/model'
import { CLIENT_EVENTS } from '@/lib/portal/client-messages'   // (gaps build H, H-Q17) the client's messages are in the log too
import { INVITE_EVENT } from '@/lib/company/invitations'
import { SUMMARY_EVENT } from '@/lib/notifications/summary'   // (pending modules S18) a member's daily summary
import { SITE_EVENTS } from '@/lib/site/team-mail'   // (pending modules S35) the website's word to OpenMaison's team
import { sendDueSummaries } from '@/lib/notifications/summary-server'
import { deliveryIsStandIn, releaseHeldMessages } from '@/lib/notifications/delivery'   // (simplify round 2, R2-C) held client emails · (pending modules S34) the stand-in
import { batchIdOf } from '@/lib/notifications/safeguards'   // (parity map, UC-082)
import { SENT_PAGE, type SentChannel, type SentMessage, type SentPage, type SentQuery, type SentStatus, type SentEvent } from '@/lib/notifications/outbox'

/**
 * (gaps build E, item 5) Settings › Notifications › Sent messages: the outbox, newest first, by channel and event. The studio's Owners and
 * Admins read every message (they run the rules); anyone else reads the messages sent to them — the log names leads, and Who sees leads
 * holds there too.
 */
const ALL_EVENTS: SentEvent[] = [...EVENTS.map((e) => e.key), ...CLIENT_EVENTS.map((e) => e.key), INVITE_EVENT, SUMMARY_EVENT, ...SITE_EVENTS]   // (pending modules S09) and the invitations to new members — (S18) and the members' daily summaries

export async function fetchSentMessages(q: Partial<SentQuery> = {}): Promise<SentPage> {
  await releaseHeldMessages()   // (simplify round 2, R2-C) what came due goes before the log is read — a held row says when it goes
  await sendDueSummaries()   // (pending modules S18) and the morning's summaries, from 8 AM
  const [me] = await db.select({ id: members.id, role: members.role }).from(members).where(eq(members.id, await sessionMemberId())).limit(1)
  const everyone = runsStudio(me?.role)
  const mine = everyone ? null : eq(notificationOutbox.memberId, me?.id ?? '')
  const channel = q.channel === 'email' || q.channel === 'whatsapp' ? q.channel : null
  const event = q.event && q.event !== 'all' && ALL_EVENTS.includes(q.event) ? q.event : null
  const limit = Math.min(500, Math.max(SENT_PAGE, Math.round(Number(q.limit) || SENT_PAGE)))
  const where = and(...([mine, channel ? eq(notificationOutbox.channel, channel) : null, event ? eq(notificationOutbox.event, event) : null].filter(Boolean) as SQL[]))
  const [rows, [n], held] = await Promise.all([
    db.select().from(notificationOutbox).where(where).orderBy(desc(notificationOutbox.createdAt), desc(notificationOutbox.id)).limit(limit),
    db.select({ n: count() }).from(notificationOutbox).where(where),
    db.selectDistinct({ event: notificationOutbox.event }).from(notificationOutbox).where(mine ?? undefined),
  ])
  const known = new Set<string>(ALL_EVENTS)
  return {
    rows: rows.filter((r) => known.has(r.event)).map((r): SentMessage => ({
      id: r.id, at: r.createdAt.getTime(), channel: r.channel as SentChannel, event: r.event as SentEvent, toName: r.toName, toAddress: r.toAddress,
      subject: r.subject, body: r.body, href: r.href, status: r.status as SentStatus, sendAfter: r.sendAfter?.getTime() ?? null, error: r.error, provider: r.provider,
      attempts: r.attempts, nextTryAt: r.nextTryAt?.getTime() ?? null, batch: batchIdOf(r.error),   // (parity map, UC-082 · UC-083)
      deliveredAt: r.deliveredAt?.getTime() ?? null, readAt: r.readAt?.getTime() ?? null,   // (pending modules S34) the provider's receipts
    })),
    total: Number(n?.n ?? 0),
    events: ALL_EVENTS.filter((k) => held.some((h) => h.event === k)),
    everyone,
    simulated: deliveryIsStandIn(),   // (pending modules S34)
  }
}
