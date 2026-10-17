import 'server-only'
import { and, eq, inArray, isNull, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversationMessages, conversationParticipants, conversationPrefs, conversations, leadMessages, leads, members, projectMessages, projects, vendors } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { conversationKey, firstWords } from './messages-model'

/*
 * (parity map 2026-10-10 — her "build everything that's in 1.0", UC-064 · UC-067 · UC-069 · UC-070) What a conversation needs beyond its
 * lines (lib/projects/messages.ts): each member's own place for it (Pin to top, Mute — `conversation_prefs`, kept on the server so a mute
 * holds on every device and the bell honours it), the cards "A contact" shares (the studio's members and its vendors), and ⌘K's Messages
 * scope (a message by its words, opening its conversation at it). This module never reads messages.ts (that one reads this).
 */

export type ConversationPrefs = { pinned: boolean; muted: boolean }
/** This member's pins and mutes for these conversations (keys as `conversationKey` makes them). */
export async function prefsOf(memberId: string, keys: readonly string[]): Promise<Map<string, ConversationPrefs>> {
  if (!memberId || !keys.length) return new Map()
  const rows = await db.select().from(conversationPrefs).where(and(eq(conversationPrefs.memberId, memberId), inArray(conversationPrefs.conversation, [...new Set(keys)])))
  return new Map(rows.map((r) => [r.conversation, { pinned: !!r.pinnedAt, muted: !!r.mutedAt }]))
}
/** Pin or unpin, mute or unmute one conversation for one member — the other half is left as it is. */
export async function setPrefs(memberId: string, key: string, patch: Partial<ConversationPrefs>): Promise<ConversationPrefs> {
  const now = new Date()
  const [had] = await db.select().from(conversationPrefs).where(and(eq(conversationPrefs.memberId, memberId), eq(conversationPrefs.conversation, key))).limit(1)
  const pinnedAt = patch.pinned === undefined ? had?.pinnedAt ?? null : patch.pinned ? had?.pinnedAt ?? now : null
  const mutedAt = patch.muted === undefined ? had?.mutedAt ?? null : patch.muted ? had?.mutedAt ?? now : null
  await db.insert(conversationPrefs).values({ memberId, conversation: key, pinnedAt, mutedAt })
    .onConflictDoUpdate({ target: [conversationPrefs.memberId, conversationPrefs.conversation], set: { pinnedAt, mutedAt } })
  return { pinned: !!pinnedAt, muted: !!mutedAt }
}
/** (UC-070) The members among these who muted this conversation — its bell leaves them out. */
export async function mutedAmong(key: string, memberIds: readonly string[]): Promise<Set<string>> {
  if (!memberIds.length) return new Set()
  const rows = await db.select({ memberId: conversationPrefs.memberId, mutedAt: conversationPrefs.mutedAt }).from(conversationPrefs)
    .where(and(eq(conversationPrefs.conversation, key), inArray(conversationPrefs.memberId, [...memberIds])))
  return new Set(rows.filter((r) => !!r.mutedAt).map((r) => r.memberId))
}

/** (UC-067) A card a message can share: a member of the studio or one of its vendors, with the number Call and WhatsApp use. */
export type ContactCard = { id: string; kind: 'member' | 'vendor'; name: string; role: string; phone: string | null }
export async function contactCards(): Promise<ContactCard[]> {
  const [team, vs] = await Promise.all([
    db.select({ id: members.id, name: members.name, role: members.role, phone: members.phone, active: members.isActive }).from(members),
    db.select({ id: vendors.id, name: vendors.name, trade: vendors.trade, contactName: vendors.contactName, phone: vendors.phone, active: vendors.isActive, mergedInto: vendors.mergedInto }).from(vendors),
  ])
  return [
    ...team.filter((m) => m.active !== false).map((m): ContactCard => ({ id: m.id, kind: 'member', name: m.name, role: m.role, phone: m.phone ?? null })),
    ...vs.filter((v) => v.active !== false && !v.mergedInto).map((v): ContactCard => ({ id: v.id, kind: 'vendor', name: v.contactName ? `${v.contactName} · ${v.name}` : v.name, role: v.trade ? `Vendor · ${v.trade}` : 'Vendor', phone: v.phone ?? null })),
  ].sort((a, b) => Number(a.kind === 'vendor') - Number(b.kind === 'vendor') || a.name.localeCompare(b.name))
}

/* ── (UC-069) ⌘K › Messages: a message by its words, on a lead the viewer sees; it opens its conversation at it ─────────────────────── */
export type MessageHit = { kind: 'message'; id: string; title: string; sub: string; chip: string | null; href: string; icon: string; others: (string | null)[] }
export async function messageHits(key: string, seesLead: (leadId: string) => boolean, viewerId?: string): Promise<MessageHit[]> {
  const k = `%${key.trim()}%`
  const [rows, early, live] = await Promise.all([
    db.select({ id: projectMessages.id, projectId: projectMessages.projectId, leadId: projectMessages.leadId, channel: projectMessages.channel, body: projectMessages.body, by: projectMessages.authorName, at: projectMessages.createdAt, project: projects.name, client: leads.name })
      .from(projectMessages).innerJoin(projects, eq(projects.id, projectMessages.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
      .where(and(isNull(projectMessages.deletedAt), isNull(projects.deletedAt), isNull(leads.deletedAt), or(like(projectMessages.body, k), like(projectMessages.authorName, k)))).limit(80),
    db.select({ id: leadMessages.id, leadId: leadMessages.leadId, body: leadMessages.body, by: leadMessages.authorName, at: leadMessages.createdAt, client: leads.name })
      .from(leadMessages).innerJoin(leads, eq(leads.id, leadMessages.leadId)).where(and(isNull(leadMessages.deletedAt), isNull(leads.deletedAt), or(like(leadMessages.body, k), like(leadMessages.authorName, k)))).limit(40),
    db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(isNull(projects.deletedAt)),
  ])
  const projectOf = new Map(live.map((p) => [p.leadId, p.id]))
  const day = (d: Date) => d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
  /* (pending modules S26) the studio's own conversations: a lead's Team one (whoever sees the lead — the project's once Won), and the members'
     ones this member is in (never two others' words), and a group by its name */
  const own: MessageHit[] = []
  if (viewerId) {
    const [rows2, groups] = await Promise.all([
      db.select({ id: conversationMessages.id, conversationId: conversationMessages.conversationId, body: conversationMessages.body, by: conversationMessages.authorName, at: conversationMessages.createdAt, kind: conversations.kind, leadId: conversations.leadId, name: conversations.name })
        .from(conversationMessages).innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId))
        .where(and(isNull(conversationMessages.deletedAt), isNull(conversationMessages.event), or(like(conversationMessages.body, k), like(conversationMessages.authorName, k)))).limit(80),
      db.select({ id: conversations.id, name: conversations.name }).from(conversations).where(and(eq(conversations.kind, 'group'), like(conversations.name, k))).limit(20),
    ])
    const mine = new Set((await db.select({ id: conversationParticipants.conversationId }).from(conversationParticipants)
      .where(and(eq(conversationParticipants.memberId, viewerId), isNull(conversationParticipants.removedAt)))).map((r) => r.id))
    const leadNames = new Map((await db.select({ id: leads.id, name: leads.name, deletedAt: leads.deletedAt }).from(leads)).filter((l) => !l.deletedAt).map((l) => [l.id, titleCaseName(l.name)]))
    for (const r of rows2) {
      if (!r.body.trim()) continue
      if (r.kind === 'lead') {
        if (!r.leadId || !leadNames.has(r.leadId) || !seesLead(r.leadId)) continue
        const pid = projectOf.get(r.leadId)
        own.push({ kind: 'message', id: r.id, title: firstWords(r.body, 90), sub: [r.by, `Team · ${leadNames.get(r.leadId)}`, day(r.at)].join(' · '), chip: 'Team',
          href: pid ? `/projects/${pid}/messages?channel=team&at=${encodeURIComponent(r.id)}` : `/chat?open=${encodeURIComponent(conversationKey('lead-team', r.leadId))}&at=${encodeURIComponent(r.id)}`, icon: 'comment', others: [r.body, r.by, leadNames.get(r.leadId) ?? null] })
        continue
      }
      if (r.kind !== 'studio' && !mine.has(r.conversationId)) continue
      const where = r.kind === 'studio' ? 'Everyone' : r.kind === 'group' ? r.name ?? 'A group' : 'Direct'
      own.push({ kind: 'message', id: r.id, title: firstWords(r.body, 90), sub: [r.by, where, day(r.at)].join(' · '), chip: r.kind === 'group' ? 'Group' : r.kind === 'studio' ? 'Studio' : 'Direct',
        href: `/chat?open=${encodeURIComponent(conversationKey('chat', r.conversationId))}&at=${encodeURIComponent(r.id)}`, icon: 'comment', others: [r.body, r.by, r.name] })
    }
    for (const g of groups) if (mine.has(g.id) && g.name) own.push({ kind: 'message', id: `group-${g.id}`, title: g.name, sub: 'A group in Messages', chip: 'Group', href: `/chat?open=${encodeURIComponent(conversationKey('chat', g.id))}`, icon: 'group', others: [] })
  }
  return [
    ...own,
    ...rows.filter((r) => r.body.trim() && seesLead(r.leadId)).map((r): MessageHit => ({
      kind: 'message', id: r.id, title: firstWords(r.body, 90), sub: [r.by, r.channel === 'team' ? `Team · ${r.project}` : r.project, day(r.at)].join(' · '), chip: r.channel === 'team' ? 'Team' : null,
      href: `/projects/${r.projectId}/messages?${r.channel === 'team' ? 'channel=team&' : ''}at=${encodeURIComponent(r.id)}`, icon: 'comment', others: [r.body, r.by, titleCaseName(r.client)],
    })),
    /* a lead's message before Won — in its project's conversation once there is one */
    ...early.filter((r) => r.body.trim() && seesLead(r.leadId)).map((r): MessageHit => {
      const pid = projectOf.get(r.leadId)
      return {
        kind: 'message', id: r.id, title: firstWords(r.body, 90), sub: [r.by, titleCaseName(r.client), day(r.at)].join(' · '), chip: pid ? null : 'Lead',
        href: pid ? `/projects/${pid}/messages?at=${encodeURIComponent(r.id)}` : `/chat?open=${encodeURIComponent(conversationKey('lead', r.leadId))}&at=${encodeURIComponent(r.id)}`, icon: 'comment', others: [r.body, r.by, titleCaseName(r.client)],
      }
    }),
  ]
}
