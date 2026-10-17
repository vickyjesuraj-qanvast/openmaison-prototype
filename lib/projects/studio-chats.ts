import 'server-only'
import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chatReads, conversationFiles, conversationMessages, conversationParticipants, conversations, homeownerHouseholdLinks, homeownerLeadLinks, homeownerProfiles, members, studioInvitations, type ConversationMessage, type ConversationRow } from '@/lib/db/schema'
import { imageAddress, rawAddress } from '@/lib/leads/file-store'
import { opensWorkspace } from '@/lib/settings/roles'
import { titleCaseName } from '@/lib/format'
import { lineOf, type ChatLine } from './message-lines'
import { CHAT_LOAD, STUDIO_ROOM, chatEventWords, chatFileAddress, conversationKey, studioRoomTitle, type ChatEvent, type ChatType } from './messages-model'

/*
 * (pending modules S26 — her "build all of them" 2026-10-11; cards studio:team-chats · api:messages-free-chats) The studio's own conversations,
 * read: one among its members (`conversations` kind direct · group · studio — 1.0's New Chat, New Group and the studio-wide room its card asked
 * for) and a lead's Team conversation before Won (kind `lead`). Never a client's — no client page reads these tables, and every write here is
 * the studio's (app/projects/messages-actions.ts, app/chat/actions.ts). Who is in one: a direct or a group conversation's participants (taken
 * out or left = `removed_at`), the studio's room = every active member who opens Messages (Accounting keeps the books and opens none — 1.0's
 * inbox was owner · designer only), a lead's = whoever sees the lead (the project's Team conversation's rule).
 */

export type ChatPerson = { id: string; name: string; role: string; color: string; active: boolean }
/** Who may be in a members' conversation at all: the studio's members who open Messages (never Accounting), active or not (a member who left
    stays named on their lines). */
export async function chatMembers(): Promise<ChatPerson[]> {
  const rows = await db.select({ id: members.id, name: members.name, role: members.role, color: members.color, active: members.isActive }).from(members)
  return rows.filter((m) => opensWorkspace(m.role)).map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color, active: m.active !== false }))
}

/** A members' conversation's row — the studio's room reads as one before its first line (it is made on that line). Null when it isn't there. */
export async function chatRow(id: string): Promise<ConversationRow | null> {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1)
  if (row) return row.kind === 'lead' ? null : row
  return id === STUDIO_ROOM ? { id: STUDIO_ROOM, kind: 'studio', name: null, leadId: null, pairKey: null, createdBy: null, createdAt: new Date(0), lastMessageAt: null } : null
}
export const chatTypeOf = (row: Pick<ConversationRow, 'kind'>): ChatType => (row.kind === 'direct' ? 'direct' : row.kind === 'group' ? 'group' : 'studio')

/** Who is in it now, oldest first — and when each joined (the room: whoever is in the studio, from their invitation). */
export async function chatPeople(row: Pick<ConversationRow, 'id' | 'kind'>, everyone?: ChatPerson[]): Promise<(ChatPerson & { joinedAt: number })[]> {
  const team = everyone ?? await chatMembers()
  if (row.kind === 'studio') {
    const invited = await db.select({ memberId: studioInvitations.memberId, at: studioInvitations.createdAt }).from(studioInvitations)
    const since = new Map(invited.map((i) => [i.memberId, i.at.getTime()]))
    return team.filter((m) => m.active).map((m) => ({ ...m, joinedAt: since.get(m.id) ?? 0 }))
  }
  const rows = await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, row.id), isNull(conversationParticipants.removedAt)))
    .orderBy(conversationParticipants.addedAt)
  const byId = new Map(team.map((m) => [m.id, m]))
  return rows.flatMap((r) => { const m = byId.get(r.memberId); return m ? [{ ...m, joinedAt: r.addedAt.getTime() }] : [] })
}

/** How the conversation is called for `viewerId`: the other person's name, the group's name, the studio's room. */
export function chatTitle(row: Pick<ConversationRow, 'kind' | 'name'>, people: readonly ChatPerson[], viewerId: string, studio: string, everyone: readonly ChatPerson[] = people, pair?: string | null): string {
  if (row.kind === 'studio') return studioRoomTitle(studio)
  if (row.kind === 'group') return row.name?.trim() || people.map((p) => p.name.trim()).join(', ') || 'A group'   // (S42 audit C-13) members as stored
  /* a direct conversation: the other of its pair, even once they are no longer in the studio */
  const otherId = (pair ?? '').split('|').find((id) => id !== viewerId)
  return everyone.find((p) => p.id === otherId)?.name ?? people.find((p) => p.id !== viewerId)?.name ?? 'A member'
}

/** A members' conversation's lines (the latest CHAT_LOAD before `before`, oldest first): a member's words with their photos and files (served
    by /chat/file), and the group's own lines in this reader's words ("You added Hui Min"). */
export async function chatLinesFor(conversationId: string, o: { before?: number | null; limit?: number; viewerId: string }): Promise<{ lines: ChatLine[]; more: boolean }> {
  const limit = o.limit ?? CHAT_LOAD
  const rows = await db.select().from(conversationMessages)
    .where(and(eq(conversationMessages.conversationId, conversationId), o.before ? lt(conversationMessages.createdAt, new Date(o.before)) : undefined))
    .orderBy(desc(conversationMessages.createdAt)).limit(limit + 1)
  const tint = await tints()
  return { more: rows.length > limit, lines: rows.slice(0, limit).reverse().map((m) => chatLineOf(m, tint, o.viewerId, { src: chatFileAddress, fileSrc: chatFileAddress })) }
}
/** One stored line as the thread draws it — `src` makes its pictures' and files' addresses (a members' conversation's own route, a lead's Files). */
export function chatLineOf(m: ConversationMessage, tint: Map<string, string>, viewerId: string, o: { src: (id: string) => string; fileSrc: (id: string) => string; fromLead?: boolean }): ChatLine {
  const line = lineOf({ id: m.id, authorKind: 'studio', authorId: m.authorId, authorName: m.authorName, body: m.body, createdAt: m.createdAt, deletedAt: m.deletedAt, attachments: m.attachments, meta: null }, o.src, tint, { fileSrc: o.fileSrc, fromLead: o.fromLead })
  if (!m.event) return line
  const meta = (m.meta && typeof m.meta === 'object' ? m.meta : {}) as Parameters<typeof chatEventWords>[1]
  return { ...line, body: chatEventWords(m.event as ChatEvent, meta, viewerId), event: m.event, removed: false }
}
async function tints(): Promise<Map<string, string>> {
  const team = await db.select({ id: members.id, color: members.color }).from(members)
  return new Map(team.map((m) => [m.id, m.color]))
}

/* ── a lead's Team conversation before Won ─────────────────────────────────────────────────────────────────────────────────────── */
/** The lead's Team conversation's row id — null before its first line (it is made on that line). */
export async function leadTeamId(leadId: string): Promise<string | null> {
  const [row] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.leadId, leadId), eq(conversations.kind, 'lead'))).limit(1)
  return row?.id ?? null
}
/** Its lines, as a project's Team conversation's (pictures and files in the lead's Files › Messages). `fromLead` marks them for the project's
    Team conversation, which reads them first once Won. */
export async function leadTeamLines(leadId: string, o: { before?: number | null; limit?: number; viewerId: string; fromLead?: boolean }): Promise<{ lines: ChatLine[]; more: boolean }> {
  const id = await leadTeamId(leadId)
  if (!id) return { lines: [], more: false }
  const limit = o.limit ?? CHAT_LOAD
  const rows = await db.select().from(conversationMessages)
    .where(and(eq(conversationMessages.conversationId, id), o.before ? lt(conversationMessages.createdAt, new Date(o.before)) : undefined))
    .orderBy(desc(conversationMessages.createdAt)).limit(limit + 1)
  const tint = await tints()
  return { more: rows.length > limit, lines: rows.slice(0, limit).reverse().map((m) => chatLineOf(m, tint, o.viewerId, { src: imageAddress, fileSrc: rawAddress, fromLead: o.fromLead })) }
}

/* ── who has read it — "Seen by …" under one's own newest line (S26: 1.0 drew two ticks on every line, whoever had read it) ──────── */
/** The read marks of the other readers of these read ids (a conversation's, and — for a project's — its lead's chapter's): the members on
    the studio's side (`side: 'members'`), the client and the household on theirs (`side: 'client'`). The newest mark per reader. */
export async function readersOf(readIds: readonly string[], side: 'members' | 'client', o: { leadId?: string | null; viewerId: string; only?: readonly string[] | null }): Promise<{ name: string; at: number }[]> {
  if (!readIds.length) return []
  const rows = await db.select().from(chatReads).where(and(eq(chatReads.readerKind, side === 'members' ? 'member' : 'client'), inArray(chatReads.projectId, [...readIds])))
  const best = new Map<string, number>()
  for (const r of rows) if (r.readerId !== o.viewerId && (!o.only || o.only.includes(r.readerId))) best.set(r.readerId, Math.max(best.get(r.readerId) ?? 0, r.readAt.getTime()))
  if (!best.size) return []
  if (side === 'members') {
    const names = await db.select({ id: members.id, name: members.name }).from(members).where(inArray(members.id, [...best.keys()]))
    return names.map((n) => ({ name: n.name.trim(), at: best.get(n.id)! })).sort((a, b) => a.at - b.at)   // (S42 C-13) "Seen by Hui Min"
  }
  /* the client's side: only the people on this home (the lead's client and the household invited) */
  const lead = o.leadId ?? null
  const [own, house] = lead ? await Promise.all([
    db.select({ id: homeownerLeadLinks.homeownerId }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, lead)),
    db.select({ id: homeownerHouseholdLinks.homeownerId }).from(homeownerHouseholdLinks).where(and(eq(homeownerHouseholdLinks.leadId, lead), isNull(homeownerHouseholdLinks.removedAt))),
  ]) : [[], []]
  const home = new Set([...own, ...house].map((x) => x.id))
  const ids = [...best.keys()].filter((id) => home.has(id))
  if (!ids.length) return []
  const names = await db.select({ id: homeownerProfiles.id, name: homeownerProfiles.name }).from(homeownerProfiles).where(inArray(homeownerProfiles.id, ids))
  return names.map((n) => ({ name: titleCaseName(n.name).split(/\s+/)[0] ?? n.name, at: best.get(n.id)! })).sort((a, b) => a.at - b.at)
}

/* ── the inbox: every members' conversation this member is in, and every lead's Team conversation they see ─────────────────────── */
export type ChatInboxEntry = { key: string; kind: 'chat' | 'lead-team'; type: ChatType | null; id: string; leadId: string | null; title: string
  last: { by: string; body: string; at: number; removed: boolean } | null; unread: number; createdAt: number }
type Gist = (m: ConversationMessage) => string
/** The members' conversations `viewerId` is in (the studio's room always; a direct one once it has a line or they started it), each with its
    newest line and how many lines others wrote since they last read it (never one from before they joined). */
export async function chatInbox(viewerId: string, studio: string, gist: Gist): Promise<ChatInboxEntry[]> {
  const everyone = await chatMembers()
  const mine = await db.select({ id: conversationParticipants.conversationId, addedAt: conversationParticipants.addedAt }).from(conversationParticipants)
    .where(and(eq(conversationParticipants.memberId, viewerId), isNull(conversationParticipants.removedAt)))
  const ids = [...new Set([...mine.map((m) => m.id), STUDIO_ROOM])]
  const rows = (await db.select().from(conversations).where(inArray(conversations.id, ids))).filter((r) => r.kind !== 'lead')
  if (!rows.some((r) => r.id === STUDIO_ROOM)) { const room = await chatRow(STUDIO_ROOM); if (room) rows.push(room) }
  const [msgs, reads, parts, invite] = await Promise.all([
    db.select().from(conversationMessages).where(inArray(conversationMessages.conversationId, rows.map((r) => r.id))).orderBy(desc(conversationMessages.createdAt)),
    db.select().from(chatReads).where(and(eq(chatReads.readerKind, 'member'), eq(chatReads.readerId, viewerId))),
    db.select().from(conversationParticipants).where(and(inArray(conversationParticipants.conversationId, rows.map((r) => r.id)), isNull(conversationParticipants.removedAt))),
    db.select({ at: studioInvitations.createdAt }).from(studioInvitations).where(eq(studioInvitations.memberId, viewerId)).limit(1),
  ])
  const readOf = new Map(reads.map((r) => [r.projectId, r.readAt.getTime()]))
  const joined = new Map(mine.map((m) => [m.id, m.addedAt.getTime()]))
  const byId = new Map(everyone.map((m) => [m.id, m]))
  const out: ChatInboxEntry[] = []
  for (const r of rows) {
    const list = msgs.filter((m) => m.conversationId === r.id)
    /* (S42 audit C-14) two people's conversation joins the list with its first line — an empty start (New message › A member, then Back) leaves
       nothing half-made behind; it opens again the same (one per pair) and is listed once it says something */
    if (r.kind === 'direct' && !list.length) continue
    const people = r.kind === 'studio' ? everyone.filter((m) => m.active) : parts.filter((p) => p.conversationId === r.id).flatMap((p) => { const m = byId.get(p.memberId); return m ? [m] : [] })
    const key = conversationKey('chat', r.id)
    const floor = Math.max(readOf.get(key) ?? 0, r.kind === 'studio' ? invite[0]?.at.getTime() ?? 0 : joined.get(r.id) ?? 0)
    const top = list[0]
    out.push({
      key, kind: 'chat', type: chatTypeOf(r), id: r.id, leadId: null, title: chatTitle(r, people, viewerId, studio, everyone, r.pairKey),
      last: top ? { by: top.event ? '' : top.authorId === viewerId ? 'You' : top.authorName, body: top.event ? chatLineOf(top, new Map(), viewerId, { src: chatFileAddress, fileSrc: chatFileAddress }).body : gist(top), at: top.createdAt.getTime(), removed: !!top.deletedAt } : null,
      unread: list.filter((m) => !m.event && !m.deletedAt && m.authorId !== viewerId && m.createdAt.getTime() > floor).length,
      createdAt: r.createdAt.getTime(),
    })
  }
  return out
}
/** Every lead's Team conversation with a line, by lead (the inbox keeps the ones the viewer sees, on leads with no live project). */
export async function leadTeamConversations(): Promise<{ id: string; leadId: string; msgs: ConversationMessage[] }[]> {
  const rows = await db.select({ id: conversations.id, leadId: conversations.leadId }).from(conversations).where(eq(conversations.kind, 'lead'))
  if (!rows.length) return []
  const msgs = await db.select().from(conversationMessages).where(inArray(conversationMessages.conversationId, rows.map((r) => r.id))).orderBy(desc(conversationMessages.createdAt))
  return rows.filter((r) => r.leadId).map((r) => ({ id: r.id, leadId: r.leadId!, msgs: msgs.filter((m) => m.conversationId === r.id) })).filter((r) => r.msgs.length)
}

/** A members' conversation's file — its row, when the file is still with a line of it (a removed line's files close with it). */
export async function chatFile(fileId: string): Promise<{ id: string; conversationId: string; name: string; mime: string | null } | null> {
  const [f] = await db.select({ id: conversationFiles.id, conversationId: conversationFiles.conversationId, name: conversationFiles.name, mime: conversationFiles.mime }).from(conversationFiles).where(eq(conversationFiles.id, fileId)).limit(1)
  return f ?? null
}
