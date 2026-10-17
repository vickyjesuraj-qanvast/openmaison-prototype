'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversationFiles, conversationMessages, conversationParticipants, conversations, leadFiles, leadMessages, projectMessages, projects } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { opensWorkspace, roleScope, runsStudio } from '@/lib/settings/roles'
import { notify } from '@/lib/notifications/emit'
import { imageAddress, rawAddress } from '@/lib/leads/file-store'
import { attachmentsOf, shareOf } from '@/lib/projects/message-lines'
import { chatMembers, leadTeamId, type ChatPerson } from '@/lib/projects/studio-chats'
import { CONV_GONE, forConversation, isRefusal, type Ctx, type Refusal } from '@/lib/projects/conversation-access'
import { chatFileAddress, cleanGroupName, conversationKey, linkLabel, linksIn, pairKeyOf, placeHref, type ChatEvent } from '@/lib/projects/messages-model'

/*
 * (pending modules S26 — her "build all of them" 2026-10-11; cards studio:team-chats · api:messages-free-chats) Starting and keeping a
 * conversation among the studio's members, 1.0's New Chat · New Group · a group's members by hand (src/components/inbox/new-chat-panel.tsx,
 * context-panel.tsx; src/app/api/chats/records/** — conversations, participants), in 2.0's shape: members only (a client writes on their page,
 * anyone else is WhatsApp — 1.0's chat with a typed number reached nobody), one conversation per pair, a group named (1.0: "Required"), a
 * group's own lines saying who started it, added, took out, left or renamed it, every remove with its Undo. 1.0's rule for taking someone out
 * holds: a Designer never takes an Owner or an Admin out. Every refusal is `{ error: <the rule> }`. Writing in one: app/projects/messages-
 * actions.ts (`sendInConversation`, the same composer). And (card api:messages-free-chats) what a conversation has shared, as 1.0's panel
 * grouped it: Docs · Media · Links.
 */

const touch = () => revalidatePath('/chat')

async function me(): Promise<{ id: string; name: string; role: string } | Refusal> {
  const viewer = await fetchViewer()
  if (!opensWorkspace(viewer.role)) return { error: `Messages are for the studio’s members — ${roleScope(viewer.role)}` }   // (S45C) the role's own words — Marketing's were Accounting's
  const all = await chatMembers()
  const m = all.find((x) => x.id === viewer.id)
  return { id: viewer.id, name: m?.name ?? 'Someone', role: viewer.role }
}
/** The members these ids name who may be in a members' conversation now — active, opening Messages, not the asker. */
async function pickable(ids: unknown, not: readonly string[]): Promise<ChatPerson[]> {
  const want = Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === 'string'))].slice(0, 50) : []
  const all = await chatMembers()
  return want.map((id) => all.find((m) => m.id === id)).filter((m): m is ChatPerson => !!m && m.active && !not.includes(m.id))
}
/** (S42 audit C-13) a member is named as the studio stored them — "Hui Min" is one given name, never "Hui" */
const nameOf = (name: string) => name.trim()
async function line(conversationId: string, by: { id: string; name: string }, event: ChatEvent, meta: Record<string, unknown>, at = new Date()): Promise<string> {
  const id = randomUUID()
  await db.insert(conversationMessages).values({ id, conversationId, authorId: by.id, authorName: by.name, body: '', attachments: null, event, meta: { by: nameOf(by.name), byId: by.id, ...meta }, createdAt: at, deletedAt: null })
  await db.update(conversations).set({ lastMessageAt: at }).where(eq(conversations.id, conversationId))
  return id
}
/** A group the asker is in, by its key. */
async function group(key: string): Promise<(Ctx & { chat: NonNullable<Ctx['chat']> }) | Refusal> {
  const c = await forConversation(String(key ?? ''))
  if (isRefusal(c)) return c
  if (c.kind !== 'chat' || !c.chat) return { error: CONV_GONE }
  if (c.chat.type !== 'group') return { error: c.chat.type === 'studio' ? 'Everyone at the studio is in this one — mute it instead' : 'A conversation between two stays as it is — start a group to bring someone in' }
  return c as Ctx & { chat: NonNullable<Ctx['chat']> }
}

/** (1.0's New Chat) Two members' conversation — the one they already have, or a new one. Answers its key, to open it. */
export async function startDirectChat(memberId: string): Promise<{ key: string } | Refusal> {
  const who = await me(); if (isRefusal(who)) return who
  const [other] = await pickable([memberId], [who.id])
  if (!other) return { error: 'Pick someone in the studio' }
  const pair = pairKeyOf(who.id, other.id)
  const have = async () => (await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.pairKey, pair)).limit(1))[0]?.id ?? null
  const was = await have()
  if (was) return { key: conversationKey('chat', was) }
  const id = randomUUID(); const now = new Date()
  await db.insert(conversations).values({ id, kind: 'direct', name: null, leadId: null, pairKey: pair, createdBy: who.id, createdAt: now, lastMessageAt: null }).onConflictDoNothing()
  const made = (await have())!
  if (made === id) await db.insert(conversationParticipants).values([who.id, other.id].map((m) => ({ conversationId: id, memberId: m, addedBy: who.id, addedAt: now, removedAt: null, removedBy: null }))).onConflictDoNothing()
  touch()
  return { key: conversationKey('chat', made) }
}

/** (1.0's New Group) A group with a name and the people picked — the asker in it. Its first line says who started it with whom; each person
    added hears it on their bell. */
export async function createGroupChat(input: { name: string; memberIds: string[] }): Promise<{ key: string } | Refusal> {
  const who = await me(); if (isRefusal(who)) return who
  const name = cleanGroupName(input?.name)
  if (!name) return { error: 'Name the group' }
  const picked = await pickable(input?.memberIds, [who.id])
  if (!picked.length) return { error: 'Pick at least one person' }
  const id = randomUUID(); const now = new Date()
  await db.insert(conversations).values({ id, kind: 'group', name, leadId: null, pairKey: null, createdBy: who.id, createdAt: now, lastMessageAt: now })
  await db.insert(conversationParticipants).values([who.id, ...picked.map((p) => p.id)].map((m) => ({ conversationId: id, memberId: m, addedBy: who.id, addedAt: now, removedAt: null, removedBy: null })))
  await line(id, who, 'created', { names: picked.map((p) => nameOf(p.name)) }, now)
  const key = conversationKey('chat', id)
  await notify('member_message', picked.map((p) => p.id), { title: `${who.name} added you to “${name}”`, body: `A group with ${picked.length} ${picked.length === 1 ? 'other' : 'others'} — in Messages`, href: `/chat?open=${encodeURIComponent(key)}`, leadId: null, actorId: who.id })
  touch()
  return { key }
}

/** Rename a group — anyone in it (1.0's PATCH display_name). Its line says so; Undo puts the old name back and takes the line away. */
export async function renameGroupChat(key: string, input: { name: string }): Promise<{ name: string; undo: { name: string | null; lineId: string } } | Refusal> {
  const c = await group(key); if (isRefusal(c)) return c
  const name = cleanGroupName(input?.name)
  if (!name) return { error: 'Name the group' }
  const was = c.chat.row.name
  if (name === was) return { error: 'That is its name already' }
  await db.update(conversations).set({ name }).where(eq(conversations.id, c.chat.row.id))
  const lineId = await line(c.chat.row.id, c.me, 'renamed', { name })
  touch()
  return { name, undo: { name: was, lineId } }
}
export async function undoRenameGroupChat(key: string, undo: { name: string | null; lineId: string }): Promise<{ ok: true } | Refusal> {
  const c = await group(key); if (isRefusal(c)) return c
  await db.update(conversations).set({ name: cleanGroupName(undo?.name) || c.chat.row.name }).where(eq(conversations.id, c.chat.row.id))
  await db.delete(conversationMessages).where(and(eq(conversationMessages.id, String(undo?.lineId ?? '')), eq(conversationMessages.conversationId, c.chat.row.id), eq(conversationMessages.event, 'renamed')))
  touch()
  return { ok: true }
}

/** Add people to a group — anyone in it (1.0's Add). One line names them; each hears it on their bell. Someone who left comes back in. */
export async function addToGroupChat(key: string, input: { memberIds: string[] }): Promise<{ names: string[] } | Refusal> {
  const c = await group(key); if (isRefusal(c)) return c
  const picked = await pickable(input?.memberIds, c.chat.people.map((p) => p.id))
  if (!picked.length) return { error: 'Pick someone who isn’t in it yet' }
  const now = new Date()
  for (const p of picked) {
    await db.insert(conversationParticipants).values({ conversationId: c.chat.row.id, memberId: p.id, addedBy: c.me.id, addedAt: now, removedAt: null, removedBy: null })
      .onConflictDoUpdate({ target: [conversationParticipants.conversationId, conversationParticipants.memberId], set: { addedBy: c.me.id, addedAt: now, removedAt: null, removedBy: null } })
  }
  await line(c.chat.row.id, c.me, 'added', { names: picked.map((p) => nameOf(p.name)) }, now)
  await notify('member_message', picked.map((p) => p.id), { title: `${c.me.name} added you to “${c.chat.row.name ?? 'a group'}”`, body: 'In Messages', href: `/chat?open=${encodeURIComponent(c.key)}`, leadId: null, actorId: c.me.id })
  touch()
  return { names: picked.map((p) => p.name) }
}

/** Take someone out of a group — 1.0's rule: a Designer never takes an Owner or an Admin out. Undo puts them back as they were. */
export async function removeFromGroupChat(key: string, memberId: string): Promise<{ name: string; undo: { memberId: string; lineId: string } } | Refusal> {
  const c = await group(key); if (isRefusal(c)) return c
  const out = c.chat.people.find((p) => p.id === memberId)
  if (!out) return { error: 'They aren’t in this group any more' }
  if (out.id === c.me.id) return { error: 'Leave the group instead' }
  if (!runsStudio(c.viewer.role) && runsStudio(out.role)) return { error: 'Only an Owner or an Admin takes an Owner or an Admin out' }
  const now = new Date()
  await db.update(conversationParticipants).set({ removedAt: now, removedBy: c.me.id }).where(and(eq(conversationParticipants.conversationId, c.chat.row.id), eq(conversationParticipants.memberId, out.id)))
  const lineId = await line(c.chat.row.id, c.me, 'removed', { name: nameOf(out.name) }, now)
  touch()
  return { name: out.name, undo: { memberId: out.id, lineId } }
}
export async function undoRemoveFromGroupChat(key: string, undo: { memberId: string; lineId: string }): Promise<{ ok: true } | Refusal> {
  const c = await group(key); if (isRefusal(c)) return c
  const [row] = await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, c.chat.row.id), eq(conversationParticipants.memberId, String(undo?.memberId ?? '')))).limit(1)
  if (!row || !row.removedAt) return { error: 'They are back in it already' }
  await db.update(conversationParticipants).set({ removedAt: null, removedBy: null }).where(and(eq(conversationParticipants.conversationId, c.chat.row.id), eq(conversationParticipants.memberId, row.memberId)))
  await db.delete(conversationMessages).where(and(eq(conversationMessages.id, String(undo?.lineId ?? '')), eq(conversationMessages.conversationId, c.chat.row.id), eq(conversationMessages.event, 'removed')))
  touch()
  return { ok: true }
}

/** Leave a group (two people's conversation stays; the studio's room is everyone's — mute those). Undo comes back in. */
export async function leaveGroupChat(key: string): Promise<{ id: string; undo: { lineId: string } } | Refusal> {
  const c = await group(key); if (isRefusal(c)) return c
  const now = new Date()
  await db.update(conversationParticipants).set({ removedAt: now, removedBy: c.me.id }).where(and(eq(conversationParticipants.conversationId, c.chat.row.id), eq(conversationParticipants.memberId, c.me.id)))
  const lineId = await line(c.chat.row.id, c.me, 'left', { name: nameOf(c.me.name) }, now)
  touch()
  return { id: c.chat.row.id, undo: { lineId } }
}
/** Back into a group one left — only one's own leaving, and only while its line is there. */
export async function undoLeaveGroupChat(conversationId: string, undo: { lineId: string }): Promise<{ key: string } | Refusal> {
  const who = await me(); if (isRefusal(who)) return who
  const id = String(conversationId ?? '')
  const [row] = await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, id), eq(conversationParticipants.memberId, who.id))).limit(1)
  const [left] = await db.select({ id: conversationMessages.id }).from(conversationMessages).where(and(eq(conversationMessages.id, String(undo?.lineId ?? '')), eq(conversationMessages.conversationId, id), eq(conversationMessages.event, 'left'), eq(conversationMessages.authorId, who.id))).limit(1)
  if (!row || !row.removedAt || row.removedBy !== who.id || !left) return { error: CONV_GONE }
  await db.update(conversationParticipants).set({ removedAt: null, removedBy: null }).where(and(eq(conversationParticipants.conversationId, id), eq(conversationParticipants.memberId, who.id)))
  await db.delete(conversationMessages).where(eq(conversationMessages.id, left.id))
  touch()
  return { key: conversationKey('chat', id) }
}

/* ── (card api:messages-free-chats — 1.0's panel: Docs · Media · Links) what a conversation has shared ─────────────────────────── */
export type SharedItem = { id: string; kind: 'doc' | 'photo' | 'video' | 'voice' | 'link' | 'place'; name: string; by: string; at: number; href: string; thumb: string | null; messageId: string }
export type Shared = { docs: SharedItem[]; media: SharedItem[]; links: SharedItem[]
  /** a lead's or a project's conversation files its pictures and files in Files › Messages — where they all are */ filesHref: string | null }
type Stored = { id: string; authorName: string; authorKind?: string | null; body: string; createdAt: Date; photos?: unknown; attachments?: unknown; meta?: unknown; own: boolean }
/** Every photo, video, voice note, document and link the conversation's lines hold (removed lines left out), newest first. */
export async function conversationShared(key: string): Promise<Shared | Refusal> {
  const c = await forConversation(String(key ?? '')); if (isRefusal(c)) return c
  const rows: Stored[] = []
  const take = (list: { id: string; authorName: string; authorKind?: string | null; body: string; createdAt: Date; photos?: unknown; attachments?: unknown; meta?: unknown }[], own: boolean) => { for (const m of list) rows.push({ ...m, own }) }
  const convLines = async (conversationId: string | null) => (conversationId ? db.select().from(conversationMessages).where(and(eq(conversationMessages.conversationId, conversationId), isNull(conversationMessages.deletedAt), isNull(conversationMessages.event))) : [])
  if (c.kind === 'chat') take(await convLines(c.chat!.row.id), true)
  else if (c.kind === 'lead-team') take(await convLines(await leadTeamId(c.leadId!)), false)
  else if (c.kind === 'lead') take(await db.select().from(leadMessages).where(and(eq(leadMessages.leadId, c.leadId!), isNull(leadMessages.deletedAt))), false)
  else {
    take(await db.select().from(projectMessages).where(and(eq(projectMessages.projectId, c.p!.id), eq(projectMessages.channel, c.kind === 'team' ? 'team' : 'client'), isNull(projectMessages.deletedAt))), false)
    if (c.kind === 'client') take(await db.select().from(leadMessages).where(and(eq(leadMessages.leadId, c.leadId!), isNull(leadMessages.deletedAt))), false)
    else take(await convLines(await leadTeamId(c.leadId!)), false)
  }
  const chat = c.kind === 'chat'
  const photoSrc = chat ? chatFileAddress : imageAddress
  const fileSrc = chat ? chatFileAddress : rawAddress
  /* the photos' names (a photo carries none of its own in the line) */
  const photoIds = rows.flatMap((m) => [...(Array.isArray(m.photos) ? (m.photos as unknown[]).filter((x): x is string => typeof x === 'string') : []), ...attachmentsOf(m.attachments).photos])
  const named = new Map<string, string>()
  if (photoIds.length) {
    const found = chat ? await db.select({ id: conversationFiles.id, name: conversationFiles.name }).from(conversationFiles).where(inArray(conversationFiles.id, photoIds))
      : await db.select({ id: leadFiles.id, name: leadFiles.name }).from(leadFiles).where(and(inArray(leadFiles.id, photoIds), isNull(leadFiles.deletedAt)))
    for (const f of found) named.set(f.id, f.name)
  }
  const docs: SharedItem[] = [], media: SharedItem[] = [], links: SharedItem[] = []
  for (const m of rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const at = m.createdAt.getTime(), by = m.authorKind === 'client' ? m.authorName.split(/\s+/)[0] ?? m.authorName : m.authorName.trim()   // (S42 C-13) a client by first name, a member as stored
    const a = attachmentsOf(m.attachments)
    const own = Array.isArray(m.photos) ? (m.photos as unknown[]).filter((x): x is string => typeof x === 'string') : []
    for (const id of [...own, ...a.photos]) { if (!chat && !named.has(id)) continue; media.push({ id, kind: 'photo', name: named.get(id) ?? 'Photo', by, at, href: photoSrc(id), thumb: photoSrc(id), messageId: m.id }) }
    for (const f of a.files) (f.kind === 'file' ? docs : media).push({ id: f.id, kind: f.kind === 'file' ? 'doc' : f.kind, name: f.name, by, at, href: fileSrc(f.id), thumb: null, messageId: m.id })
    const share = shareOf(m.meta) ?? a.share
    if (share?.kind === 'place') links.push({ id: `${m.id}:place`, kind: 'place', name: 'The site’s location', by, at, href: placeHref(share.label), thumb: null, messageId: m.id })
    for (const href of linksIn(m.body)) links.push({ id: `${m.id}:${href}`, kind: 'link', name: linkLabel(href), by, at, href, thumb: null, messageId: m.id })
  }
  /* a lead's or a project's: the Messages folder in its Files (a project's once Won) */
  let filesHref: string | null = null
  if (!chat && c.leadId) {
    const [folder] = await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, c.leadId), eq(leadFiles.kind, 'folder'), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt), eq(leadFiles.name, 'Messages'))).limit(1)
    const [live] = folder ? await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, c.leadId), isNull(projects.deletedAt))).limit(1) : []
    if (folder) filesHref = `${live ? `/projects/${live.id}` : `/leads/${c.leadId}`}/files?folder=${encodeURIComponent(folder.id)}`
  }
  return { docs, media, links, filesHref }
}
