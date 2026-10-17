import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerHouseholdLinks, homeownerLeadLinks, homeownerProfiles, inboundMessages, leadMessages, leads, members, notificationOutbox, projectMessages, projects } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { conversationKey, firstWords, MESSAGE_MAX } from '@/lib/projects/messages-model'
import { tellTeamOfClientMessage } from '@/lib/portal/client-message-bell'
import type { Inbound } from '@/lib/notifications/webhook-read'

/*
 * (pending modules S34 — her "build all of them" 2026-10-11; card api:message-delivery-providers, "What happens to a client's WhatsApp
 * reply (1.0 only logged it)" — the card's question, taken as the most 2.0-like answer: it arrives in Messages) A client's WhatsApp reply,
 * filed where the studio already answers that client.
 *
 * Every message the provider's webhook brings is kept once (`inbound_messages`, its `provider_ref`) — a provider delivering it twice files
 * it once. Then it is placed, in this order:
 *   1. a reply to one of the studio's own messages to a client (WhatsApp's `context.id` = the wamid the outbox kept as `provider_ref`) → that
 *      message's lead;
 *   2. a number on record for exactly one live lead — a client invited to the portal (or one of their household), else the lead's own
 *      mobile or its second client's;
 *   3. a studio member's own number → kept, not filed (`from_member`: their notices aren't a conversation);
 *   4. anything else → kept as it came (`unmatched`) — a number on two leads is never guessed between.
 * A placed message with words becomes the client's line in that lead's conversation — the project's Client conversation once Won, else the
 * lead's (Messages, the same tables the portal writes) — and the team hears it on the bell exactly as a message from the portal
 * (`tellTeamOfClientMessage`). A picture or a voice note with no words is kept (`not_text`): fetching its media is the provider's own call.
 * The studio answers in Messages, and the answer reaches the client the way every answer does (the portal, its emails). The prototype's
 * outbox sends nothing, so nothing is ever answered on it — the probe files one through the route (app/api/webhooks/whatsapp).
 */

export type FiledInbound = { providerRef: string; status: 'filed' | 'unmatched' | 'from_member' | 'not_text' | 'duplicate'; leadId: string | null; messageId: string | null }

/** The eight digits a Singapore number is kept by on a lead (REG-456); a foreign number keeps all its digits. */
export function localDigits(address: string): string {
  const d = address.replace(/\D+/g, '')
  return d.length === 10 && d.startsWith('65') ? d.slice(2) : d
}

async function leadOfReply(replyTo: string | null): Promise<string | null> {
  if (!replyTo) return null
  const [r] = await db.select({ leadId: notificationOutbox.leadId, memberId: notificationOutbox.memberId }).from(notificationOutbox).where(eq(notificationOutbox.providerRef, replyTo)).limit(1)
  return r && r.memberId === null && r.leadId ? r.leadId : null
}

/** The live lead this number belongs to, and the person writing — or null when it is none or more than one. */
async function leadOfNumber(digits: string): Promise<{ leadId: string; name: string; homeownerId: string | null } | null> {
  if (!digits) return null
  /* a client invited to the portal, or one of their household — the person, by their own profile */
  const [profile] = await db.select({ id: homeownerProfiles.id, name: homeownerProfiles.name }).from(homeownerProfiles).where(eq(homeownerProfiles.phone, digits)).limit(1)
  if (profile) {
    const own = await db.select({ leadId: homeownerLeadLinks.leadId }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.homeownerId, profile.id))
    const house = await db.select({ leadId: homeownerHouseholdLinks.leadId }).from(homeownerHouseholdLinks).where(and(eq(homeownerHouseholdLinks.homeownerId, profile.id), isNull(homeownerHouseholdLinks.withdrawnAt)))
    const ids = [...new Set([...own, ...house].map((r) => r.leadId))]
    const live = ids.length ? await db.select({ id: leads.id }).from(leads).where(and(inArray(leads.id, ids), isNull(leads.deletedAt))) : []
    if (live.length === 1) return { leadId: live[0]!.id, name: titleCaseName(profile.name), homeownerId: profile.id }
    if (live.length > 1) return null
  }
  const rows = await db.select({ id: leads.id, name: leads.name, phone: leads.phone, client2Name: leads.client2Name, client2Phone: leads.client2Phone }).from(leads)
    .where(and(isNull(leads.deletedAt), or(eq(leads.phone, digits), eq(leads.client2Phone, digits))))
  if (rows.length !== 1) return null
  const l = rows[0]!
  return { leadId: l.id, name: titleCaseName(l.phone === digits ? l.name : l.client2Name || l.name), homeownerId: null }
}

/** Keep and place every message that came in. Answers what became of each. Never throws for one message. */
export async function fileInbound(list: readonly Inbound[], o: { provider: string; now?: number } = { provider: 'whatsapp-cloud' }): Promise<FiledInbound[]> {
  const out: FiledInbound[] = []
  for (const m of list) {
    try {
      if (!m?.providerRef || !m.from) continue
      const id = randomUUID()
      const text = typeof m.text === 'string' ? m.text.replace(/\r\n/g, '\n').trim().slice(0, MESSAGE_MAX) : ''
      const receivedAt = new Date(Number.isFinite(m.at) ? m.at : (o.now ?? Date.now()))
      /* kept first — the unique `provider_ref` makes a second delivery of the same message a no-op */
      const kept = await db.insert(inboundMessages).values({ id, provider: o.provider, providerRef: m.providerRef.slice(0, 200), channel: 'whatsapp', fromAddress: m.from.slice(0, 40), body: text || null, kind: (m.kind || 'text').slice(0, 30), replyTo: m.replyTo?.slice(0, 200) ?? null, status: 'unmatched', leadId: null, messageId: null, receivedAt })
        .onConflictDoNothing({ target: inboundMessages.providerRef })
      if (!kept.rowsAffected) { out.push({ providerRef: m.providerRef, status: 'duplicate', leadId: null, messageId: null }); continue }
      const digits = localDigits(m.from)
      const fromMember = digits ? (await db.select({ id: members.id }).from(members).where(eq(members.phone, digits)).limit(1))[0] : undefined
      const byReply = await leadOfReply(m.replyTo)
      const byNumber = byReply ? null : await leadOfNumber(digits)
      const leadId = byReply ?? byNumber?.leadId ?? null
      const status: FiledInbound['status'] = !leadId ? (fromMember ? 'from_member' : 'unmatched') : !text ? 'not_text' : 'filed'
      let messageId: string | null = null
      if (leadId && status === 'filed') {
        const [lead] = await db.select({ name: leads.name, client2Name: leads.client2Name, client2Phone: leads.client2Phone }).from(leads).where(eq(leads.id, leadId)).limit(1)
        const author = byNumber?.name ?? (lead ? titleCaseName(lead.client2Phone === digits && lead.client2Name ? lead.client2Name : lead.name) : 'The client')
        const authorId = byNumber?.homeownerId ?? null
        const [p] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
        messageId = randomUUID()
        if (p) await db.insert(projectMessages).values({ id: messageId, projectId: p.id, leadId, authorKind: 'client', authorId, authorName: author, body: text, photos: null, createdAt: receivedAt, deletedAt: null, taskId: null, variationId: null, channel: 'client', attachments: null, meta: { via: 'whatsapp' } })
        else await db.insert(leadMessages).values({ id: messageId, leadId, authorKind: 'client', authorId, authorName: author, body: text, attachments: null, createdAt: receivedAt, deletedAt: null })
        await tellTeamOfClientMessage({ leadId, project: p ?? null, key: p ? conversationKey('client', p.id) : conversationKey('lead', leadId), from: author, gist: firstWords(text, 300) })
      }
      await db.update(inboundMessages).set({ status, leadId, messageId }).where(eq(inboundMessages.id, id))
      out.push({ providerRef: m.providerRef, status, leadId, messageId })
    } catch (e) { console.error('[inbound] a reply wasn’t kept:', e instanceof Error ? e.message : e) }
  }
  return out
}
