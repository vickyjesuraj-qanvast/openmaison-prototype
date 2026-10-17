'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, gt, inArray, isNull, like } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversationFiles, conversationMessages, conversations, leadFiles, leadMessages, notifications, projectMessages, projects } from '@/lib/db/schema'
import { CHANGE_RULE } from '@/lib/projects/policy'
import { keepChatPhotos, keepThreadPhotos, takeChatFilePiece, takeFilePiece, type FilePiece } from '@/lib/projects/thread-photos'
import { chatLines, fetchConversation, fetchProjectChat, leadChatLines, lineOf, setReadMark, type ChatLine, type ConversationData, type ProjectChatData } from '@/lib/projects/messages'
import { CHAT_QUIET_MINUTES, FILE_PIECE, MESSAGE_FILES_MAX, MESSAGE_FILE_MAX, MESSAGE_MAX, MESSAGE_PHOTOS_MAX, MESSAGE_PHOTO_DATA_MAX, STUDIO_ROOM, VOICE_MAX_MS, chatFileAddress, conversationKey, firstWords, messageFileKind, messageGist, readIdOf, sizeWords, type MessageShare } from '@/lib/projects/messages-model'
import { contactCards, mutedAmong, setPrefs, type ConversationPrefs } from '@/lib/projects/conversations'
import { CONV_GONE, GONE, forConversation, hrefOfCtx, isRefusal, readIdOfCtx, writeRule, type Ctx, type Refusal } from '@/lib/projects/conversation-access'
import { chatLineOf, chatLinesFor, leadTeamLines } from '@/lib/projects/studio-chats'
import { imageAddress, rawAddress } from '@/lib/leads/file-store'
import { tellClient } from '@/lib/portal/client-messages-send'
import { notify } from '@/lib/notifications/emit'
import { makeAskTask, raiseAskVariation } from '@/lib/projects/client-asks'   // (simplify S-22)
import { saveVersionToFiles } from '@/app/visualizer/actions'   // (parity map, TD-122) a render files once in Files › Renders
import { workspaceRefusal, offWorkspace } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build H — H-Q11…H-Q15) The team's side of a project's conversation. Whoever sees the project reads it; the project's team, their
 * Managers, Owners and Admins write in it (`mayChangeProject`) — a completed project's conversation carries on. Each writer removes only
 * their own message, with Undo. Every refusal answers `{ error }`; a photo travels inside one object.
 * (parity map 2026-10-10 — UC-064 · UC-066 · UC-067 · UC-070 · TD-122) Any conversation, by its key: a project's with the client's side, the
 * project's team's (the client never sees it; `team_message` to the project's members), a lead's before Won (the lead invited to the portal
 * writes from their page; the same rule decides who answers — the lead's members, their Managers, Owners and Admins). A message carries
 * files beyond photos (sent in pieces, up to 25 MB, filed in Files › Messages), a voice note, the site's place or a person's card. Pin and
 * Mute are each member's own; a muted conversation rings no bell for them.
 * (pending modules S26 — her "build all of them" 2026-10-11) Two more kinds through the same actions and the same composer: a lead's Team
 * conversation before Won (`lead-team` — the lead's members hear `team_message`; its files go to the lead's Files › Messages; once Won the
 * project's Team conversation carries it on) and a conversation among the studio's members (`chat` — two people, a named group, the studio's
 * room; its people hear `member_message`; its files stay with it). Neither ever reaches a client: no client page reads their tables, and a
 * client's bell is told only by `tellClient`, which these never call. Who may write: lib/projects/conversation-access.ts.
 */
const MSG_GONE = 'This message isn’t there any more'

const forProject = (projectId: string) => forConversation(conversationKey('client', String(projectId ?? '')))
const touch = (projectId: string | null) => { if (projectId) revalidatePath(`/projects/${projectId}/messages`); revalidatePath('/chat') }

/** What a message may carry beyond its words: photos (data URLs, as the browser shrank them), files already sent in pieces
    (`uploadMessageFile` — their ids, a voice note's length), the site's place, a person's card. */
export type MessageInput = { body: string; photos?: string[]; files?: { fileId: string; durationMs?: number | null }[]; share?: { kind: 'place' } | { kind: 'contact'; id: string } }

/** (S26) The row a lead's Team conversation or the studio's room keeps — made with its first line (one per lead; the room's id is fixed). */
async function rowFor(c: Ctx): Promise<string> {
  if (c.kind === 'chat') {
    const row = c.chat!.row
    if (row.kind === 'studio') await db.insert(conversations).values({ id: STUDIO_ROOM, kind: 'studio', name: null, leadId: null, pairKey: null, createdBy: c.me.id, createdAt: new Date(), lastMessageAt: null }).onConflictDoNothing()
    return row.id
  }
  await db.insert(conversations).values({ id: randomUUID(), kind: 'lead', name: null, leadId: c.leadId!, pairKey: null, createdBy: c.me.id, createdAt: new Date(), lastMessageAt: null }).onConflictDoNothing()
  const [row] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.leadId, c.leadId!), eq(conversations.kind, 'lead'))).limit(1)
  return row!.id
}
/** The members who hear a line: the conversation's people (a members' one) or the lead's / project's members — never the writer, never
    whoever muted it, once in the quiet window while the last bell waits unread. */
async function hearers(c: Ctx, kind: 'team_message' | 'member_message', href: string, now: Date): Promise<string[]> {
  const people = c.kind === 'chat' ? c.chat!.people.filter((x) => x.active).map((x) => x.id) : c.team
  const muted = await mutedAmong(c.key, people)
  const since = new Date(now.getTime() - CHAT_QUIET_MINUTES * 60_000)
  const waiting = people.length ? new Set((await db.select({ memberId: notifications.memberId }).from(notifications)
    .where(and(eq(notifications.kind, kind), like(notifications.href, `${href}%`), gt(notifications.createdAt, since), isNull(notifications.readAt), inArray(notifications.memberId, people)))).map((r) => r.memberId)) : new Set<string>()
  return people.filter((m) => m !== c.me.id && !muted.has(m) && !waiting.has(m))
}
/** (S26) What a members' conversation is called in a bell — the group's name, the studio's room's; two people need none. */
function chatBellTitle(c: Ctx): string {
  const t = c.chat!.type
  if (t === 'direct') return `${c.me.name} sent you a message`
  return `${c.me.name} in ${t === 'studio' ? 'Everyone' : c.chat!.row.name ?? 'a group'}`
}

/** Write in a conversation, by its key. Answers the line as the thread draws it. */
export async function sendInConversation(key: string, input: MessageInput): Promise<{ line: ChatLine } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forConversation(key); if (isRefusal(c)) return c
  if (!c.mayWrite) return { error: writeRule(c, CHANGE_RULE) }
  const body = typeof input?.body === 'string' ? input.body.replace(/\r\n/g, '\n').trim().slice(0, MESSAGE_MAX) : ''
  /* (UC-066) the files sent in pieces — this lead's own, live, in Files › Messages; (S26) a members' conversation's own */
  const asked = Array.isArray(input?.files) ? input.files.filter((f) => f && typeof f.fileId === 'string').slice(0, MESSAGE_FILES_MAX + 1) : []
  if (asked.length > MESSAGE_FILES_MAX) return { error: `Add up to ${MESSAGE_FILES_MAX} files at a time` }
  const askedIds = asked.map((f) => f.fileId)
  const found: { id: string; name: string; mime: string | null; sizeBytes: number | null }[] = !asked.length ? []
    : c.kind === 'chat' ? await db.select({ id: conversationFiles.id, name: conversationFiles.name, mime: conversationFiles.mime, sizeBytes: conversationFiles.sizeBytes }).from(conversationFiles).where(and(eq(conversationFiles.conversationId, c.chat!.row.id), inArray(conversationFiles.id, askedIds)))
    : await db.select({ id: leadFiles.id, name: leadFiles.name, mime: leadFiles.mime, sizeBytes: leadFiles.sizeBytes }).from(leadFiles).where(and(eq(leadFiles.leadId, c.leadId!), inArray(leadFiles.id, askedIds), isNull(leadFiles.deletedAt)))
  if (found.length !== asked.length) return { error: 'A file didn’t land — send it again' }
  const files = asked.map((f) => {
    const row = found.find((x) => x.id === f.fileId)!
    const mime = row.mime ?? ''
    const kind = messageFileKind(mime, row.name)
    const durationMs = kind === 'voice' && typeof f.durationMs === 'number' && Number.isFinite(f.durationMs) ? Math.min(VOICE_MAX_MS, Math.max(0, Math.round(f.durationMs))) : null
    return { fileId: row.id, kind, name: row.name, size: row.sizeBytes ?? 0, mime, durationMs }
  })
  /* (UC-067) the site's place is the lead's address, never one a browser sends; a card is a member's or a vendor's, read here */
  let share: MessageShare | null = null
  if (input?.share?.kind === 'place') {
    if (!c.place) return { error: c.kind === 'chat' ? 'A conversation between members has no site to share' : 'This home has no address on file — add it on the lead first' }
    share = { kind: 'place', label: c.place, href: '' }
  } else if (input?.share?.kind === 'contact') {
    const card = (await contactCards()).find((x) => x.id === (input.share as { id: string }).id)
    if (!card) return { error: 'That contact isn’t in the studio any more' }
    share = { kind: 'contact', name: card.name, role: card.role, phone: card.phone }
  }
  const convId = c.kind === 'chat' ? c.chat!.row.id : null
  const photos = c.kind === 'chat'
    ? await keepChatPhotos(convId!, c.me, input?.photos, { max: MESSAGE_PHOTOS_MAX, dataMax: MESSAGE_PHOTO_DATA_MAX })
    : await keepThreadPhotos(c.leadId!, 'Messages', c.me.name, input?.photos, { max: MESSAGE_PHOTOS_MAX, dataMax: MESSAGE_PHOTO_DATA_MAX })
  if (isRefusal(photos)) return photos
  if (!body && !photos.length && !files.length && !share) return { error: 'Write your message first' }
  const now = new Date()
  const id = randomUUID()
  const kept = share ? (share.kind === 'place' ? { kind: 'place', label: share.label } : share) : null
  const tint = new Map([[c.me.id, c.me.color]])
  const attachments = [...photos.map((fileId) => ({ fileId, kind: 'photo' })), ...files, ...(kept ? [{ share: kept }] : [])]
  let line: ChatLine
  if (c.kind === 'lead') {
    const row = { id, leadId: c.leadId!, authorKind: 'studio', authorId: c.me.id, authorName: c.me.name, body, attachments, createdAt: now, deletedAt: null }
    await db.insert(leadMessages).values({ ...row, attachments: row.attachments.length ? row.attachments : null })
    line = lineOf(row, imageAddress, tint)
  } else if (c.kind === 'chat' || c.kind === 'lead-team') {
    /* (S26) a members' conversation, or a lead's Team conversation — its row made with the first line */
    const conversationId = await rowFor(c)
    const row = { id, conversationId, authorId: c.me.id, authorName: c.me.name, body, attachments: attachments.length ? attachments : null, event: null, meta: null, createdAt: now, deletedAt: null }
    await db.insert(conversationMessages).values(row)
    await db.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conversationId))
    line = c.kind === 'chat' ? chatLineOf(row, tint, c.me.id, { src: chatFileAddress, fileSrc: chatFileAddress }) : chatLineOf(row, tint, c.me.id, { src: imageAddress, fileSrc: rawAddress })
  } else {
    const row = { id, projectId: c.p!.id, leadId: c.leadId!, authorKind: 'studio', authorId: c.me.id, authorName: c.me.name, body, photos: photos.length ? photos : null, createdAt: now, deletedAt: null, taskId: null, variationId: null,
      channel: c.kind === 'team' ? 'team' : 'client', attachments: files.length ? files : null, meta: kept }   // (simplify round 2) a new message has made nothing yet
    await db.insert(projectMessages).values(row)
    line = lineOf(row, imageAddress, tint)
  }
  await setReadMark('member', c.me.id, readIdOfCtx(c), now)   // (H-Q13) one's own message marks the conversation read
  const gist = messageGist({ body, photos: photos.length, files, share })
  const href = hrefOfCtx(c)
  if (c.kind === 'team' || c.kind === 'lead-team') {
    /* (UC-064) the team hears it — the project's (S26: or the lead's) members but the writer and whoever muted it, once in 15 minutes while it waits unread */
    const to = await hearers(c, 'team_message', href, now)
    if (to.length) await notify('team_message', to, { title: `${c.me.name} in the team chat`, body: `${firstWords(gist, 120)} · ${c.p ? c.p.name : c.client}`, href, leadId: c.leadId, actorId: c.me.id })
  } else if (c.kind === 'chat') {
    /* (S26) the people in it hear it — never the writer or whoever muted it, once in the quiet window; a members' line never reaches a client */
    const to = await hearers(c, 'member_message', href, now)
    if (to.length) await notify('member_message', to, { title: chatBellTitle(c), body: firstWords(gist, 140), href, leadId: null, actorId: c.me.id })
  } else {
    await tellClient({ event: 'client_message', leadId: c.leadId!, ref: id, path: 'messages',
      fields: { '{sender}': c.me.name.split(/\s+/)[0] ?? c.me.name, '{message}': firstWords(gist || 'Photos', 300) },
      plain: { title: `A message from ${c.me.name}`, line: `${c.me.name} sent you a message: “${firstWords(gist || 'Photos', 200)}”.` } })
  }
  touch(c.p?.id ?? null)
  return { line }
}
/** Write in a project's conversation with the client's side (the tab's and /chat's from before — `sendInConversation` takes any). */
export async function sendMessage(projectId: string, input: MessageInput): Promise<{ line: ChatLine } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  return sendInConversation(conversationKey('client', String(projectId ?? '')), input)
}

/** (UC-066) One piece of a file for a message (the browser sends a file in pieces, in order). The last piece files it in Files › Messages and
    answers its id, for the message to carry. (S26) A members' conversation keeps it with itself. */
export async function uploadMessageFile(key: string, piece: FilePiece): Promise<{ more: true } | { fileId: string; name: string; size: number; mime: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forConversation(key); if (isRefusal(c)) return c
  if (!c.mayWrite) return { error: writeRule(c, CHANGE_RULE) }
  const o = { max: MESSAGE_FILE_MAX, maxPiece: FILE_PIECE + 8, tooBig: `${typeof piece?.name === 'string' ? piece.name : 'This file'} is over ${sizeWords(MESSAGE_FILE_MAX)} — a smaller file fits` }
  if (c.kind === 'chat') return takeChatFilePiece(await rowFor(c), c.me.id, piece, o)
  return takeFilePiece(c.leadId!, 'Messages', c.me.id, piece, o)
}

/** A message by its id — a project's, a lead's (before Won) or (S26) a members' / a lead's Team one — with the conversation it is in. */
async function messageById(messageId: string) {
  const id = String(messageId ?? '')
  const [m] = await db.select().from(projectMessages).where(eq(projectMessages.id, id)).limit(1)
  if (m) return { m, key: conversationKey(m.channel === 'team' ? 'team' : 'client', m.projectId), table: 'project' as const, event: null }
  const [l] = await db.select().from(leadMessages).where(eq(leadMessages.id, id)).limit(1)
  if (l) return { m: { ...l, authorKind: l.authorKind }, key: conversationKey('lead', l.leadId), table: 'lead' as const, event: null }
  const [x] = await db.select({ m: conversationMessages, kind: conversations.kind, leadId: conversations.leadId }).from(conversationMessages)
    .innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId)).where(eq(conversationMessages.id, id)).limit(1)
  return x ? { m: { ...x.m, authorKind: 'studio' }, key: x.kind === 'lead' ? conversationKey('lead-team', x.leadId!) : conversationKey('chat', x.m.conversationId), table: 'conversation' as const, event: x.m.event } : null
}
async function setRemoved(table: 'project' | 'lead' | 'conversation', id: string, at: Date | null) {
  if (table === 'project') await db.update(projectMessages).set({ deletedAt: at }).where(eq(projectMessages.id, id))
  else if (table === 'lead') await db.update(leadMessages).set({ deletedAt: at }).where(eq(leadMessages.id, id))
  else await db.update(conversationMessages).set({ deletedAt: at }).where(eq(conversationMessages.id, id))
}
/** Remove one's own message — it reads "Message removed" to the other side; Undo puts it back. */
export async function removeMessage(messageId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await messageById(messageId)
  if (!got || got.m.deletedAt) return { error: MSG_GONE }
  const c = await forConversation(got.key); if (isRefusal(c)) return c
  if (got.event || got.m.authorKind !== 'studio' || got.m.authorId !== c.me.id) return { error: 'Only whoever wrote a message removes it' }
  await setRemoved(got.table, got.m.id, new Date())
  touch(c.p?.id ?? null)
  return { ok: true }
}
export async function restoreMessage(messageId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await messageById(messageId)
  if (!got) return { error: MSG_GONE }
  const c = await forConversation(got.key); if (isRefusal(c)) return c
  if (got.event || got.m.authorKind !== 'studio' || got.m.authorId !== c.me.id) return { error: 'Only whoever wrote a message removes it' }
  await setRemoved(got.table, got.m.id, null)
  touch(c.p?.id ?? null)
  return { ok: true }
}

/* ── (simplify S-22, her "build everything" 2026-10-09) a client's message → a task · a variation order, their words carried over ──────── */

async function forClientMessage(messageId: string) {
  const [m] = await db.select().from(projectMessages).where(eq(projectMessages.id, String(messageId ?? ''))).limit(1)
  if (!m || m.deletedAt) return { error: MSG_GONE }
  if (m.authorKind !== 'client') return { error: 'Only a client’s message makes a task or a variation order here' }
  if (m.channel === 'team') return { error: 'Only a client’s message makes a task or a variation order here' }
  const c = await forProject(m.projectId); if (isRefusal(c)) return c
  if (!c.mayWrite) return { error: CHANGE_RULE }
  const p = c.p!
  return { c, p, m, ask: { leadId: p.leadId, projectId: p.id, source: 'message' as const, ref: m.id, words: m.body, client: m.authorName, at: m.createdAt.getTime() } }
}
/** Make a task from the client's message — its title their words, its description where they came from; one per message. */
export async function messageToTask(messageId: string): Promise<{ taskId: string; title: string; made: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const x = await forClientMessage(messageId); if (isRefusal(x)) return x
  const r = await makeAskTask({ ...x.ask, memberId: x.c.me.id })
  touch(x.p.id); revalidatePath(`/projects/${x.p.id}/tasks`)
  return r
}
/** Raise a variation order from the client's message — its first line their words; one per message. Money's rule decides who may. */
export async function messageToVariation(messageId: string): Promise<{ id: string; number: string; made: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const x = await forClientMessage(messageId); if (isRefusal(x)) return x
  const r = await raiseAskVariation(x.ask)
  if (!isRefusal(r)) touch(x.p.id)
  return r
}

/** The conversation read up to now by the viewer (opening it, or a new line arriving while it is open). */
export async function markChatRead(projectId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  return markConversationRead(conversationKey('client', String(projectId ?? '')))
}
export async function markConversationRead(key: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forConversation(key); if (isRefusal(c)) return c
  await setReadMark('member', c.me.id, readIdOfCtx(c))
  return { ok: true }
}

/** The conversation as it stands now (the open thread checks every few seconds), or the lines before `before` (Show earlier). */
export async function readChat(projectId: string, input: { before?: number | null } = {}): Promise<ProjectChatData | { lines: ChatLine[]; more: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (input?.before) return chatLines(c.p!.id, { before: Number(input.before) })
  return (await fetchProjectChat(c.p!.id)) ?? { error: GONE }
}
/** (parity map) Any conversation as it stands now, or its lines before `before`. */
export async function readConversation(key: string, input: { before?: number | null } = {}): Promise<ConversationData | { lines: ChatLine[]; more: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forConversation(key); if (isRefusal(c)) return c
  if (input?.before) {
    const before = Number(input.before)
    if (c.kind === 'lead') return leadChatLines(c.leadId!, { before })
    if (c.kind === 'lead-team') return leadTeamLines(c.leadId!, { before, viewerId: c.me.id })   // (S26)
    if (c.kind === 'chat') return chatLinesFor(c.chat!.row.id, { before, viewerId: c.me.id })   // (S26)
    return chatLines(c.p!.id, { before, channel: c.kind === 'team' ? 'team' : 'client', leadId: c.leadId! })
  }
  return (await fetchConversation(c.key)) ?? { error: CONV_GONE }
}

/** (UC-070) Pin to top / Mute — the viewer's own, kept on the server (a mute holds on every device; the bell honours it). */
export async function setConversationPrefs(key: string, patch: Partial<ConversationPrefs>): Promise<{ prefs: ConversationPrefs } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forConversation(key); if (isRefusal(c)) return c
  const clean: Partial<ConversationPrefs> = {}
  if (typeof patch?.pinned === 'boolean') clean.pinned = patch.pinned
  if (typeof patch?.muted === 'boolean') clean.muted = patch.muted
  const prefs = await setPrefs(c.me.id, c.key, clean)
  revalidatePath('/chat')
  return { prefs }
}

/* ── (parity map, TD-122) a render sent to the project's Messages ─────────────────────────────────────────────────────────────── */

/** Where a design's renders may go: its lead's live project, when the viewer may write in its conversations — else null (no press). */
export async function renderMessageTarget(leadId: string): Promise<{ projectId: string; projectName: string; client: string } | null> {
  if (await offWorkspace()) return null   // (S45C) the workspace's role rule: Marketing reads nothing here
  if (typeof leadId !== 'string' || !leadId) return null
  const [p] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  if (!p) return null
  const c = await forProject(p.id)
  if (isRefusal(c) || !c.mayWrite) return null
  return { projectId: p.id, projectName: p.name, client: c.client }
}
/** Send a version to the project's Messages — the client's conversation or the team's — with a line of text: the render is filed once in
    Files › Renders (the Visualizer's Save to Files) and rides the message as its photo. Answers the message, to open the conversation at it. */
export async function sendRenderToMessages(projectId: string, input: { channel: 'client' | 'team'; body: string; jobId: string; variantId: number }): Promise<{ messageId: string; href: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (!c.mayWrite) return { error: CHANGE_RULE }
  const filed = await saveVersionToFiles(String(input?.jobId ?? ''), Number(input?.variantId))
  if ('error' in filed) return filed
  if (filed.leadId !== c.leadId) return { error: 'This design belongs to another lead' }
  const channel = input?.channel === 'team' ? 'team' : 'client'
  const now = new Date()
  const id = randomUUID()
  const body = typeof input?.body === 'string' ? input.body.trim().slice(0, MESSAGE_MAX) : ''
  await db.insert(projectMessages).values({ id, projectId: c.p!.id, leadId: c.leadId, authorKind: 'studio', authorId: c.me.id, authorName: c.me.name, body, photos: [filed.fileId], createdAt: now, deletedAt: null, taskId: null, variationId: null, channel, attachments: null, meta: null })
  await setReadMark('member', c.me.id, readIdOf(channel, c.p!.id), now)
  const href = `/projects/${c.p!.id}/messages?${channel === 'team' ? 'channel=team&' : ''}at=${encodeURIComponent(id)}`
  if (channel === 'team') {
    const muted = await mutedAmong(conversationKey('team', c.p!.id), c.team)
    const to = c.team.filter((m) => m !== c.me.id && !muted.has(m))
    if (to.length) await notify('team_message', to, { title: `${c.me.name} in the team chat`, body: `${firstWords(body || 'A render', 120)} · ${c.p!.name}`, href: `/projects/${c.p!.id}/messages?channel=team`, leadId: c.leadId, actorId: c.me.id })
  } else {
    await tellClient({ event: 'client_message', leadId: c.leadId, ref: id, path: 'messages',
      fields: { '{sender}': c.me.name.split(/\s+/)[0] ?? c.me.name, '{message}': firstWords(body || 'A new design for your home', 300) },
      plain: { title: `A message from ${c.me.name}`, line: `${c.me.name} sent you a design: “${firstWords(body || 'A new design for your home', 200)}”.` } })
  }
  touch(c.p!.id)
  return { messageId: id, href }
}
