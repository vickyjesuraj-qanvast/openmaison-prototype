'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leadMessages, leads, projectMessages, projects } from '@/lib/db/schema'
import { keepThreadPhotos, takeFilePiece, type FilePiece } from '@/lib/projects/thread-photos'
import { chatLines, fetchPortalConversations, leadChatLines, lineOf, setReadMark, type ChatLine, type PortalConversation } from '@/lib/projects/messages'
import { forClient } from '@/lib/company/member-photo'
import { FILE_PIECE, MESSAGE_FILES_MAX, MESSAGE_FILE_MAX, MESSAGE_MAX, MESSAGE_PHOTOS_MAX, MESSAGE_PHOTO_DATA_MAX, VOICE_MAX_MS, conversationKey, messageFileKind, messageGist, readIdOf, sizeWords } from '@/lib/projects/messages-model'
import { tellTeamOfClientMessage } from '@/lib/portal/client-message-bell'   // (pending modules S34)
import { portalFileHref } from '@/lib/portal/files'
import { portalActor, type PortalVisitor } from '@/lib/portal/session'
import { clientFaces } from '@/lib/portal/faces'   // (pending modules S13)

/*
 * (gaps build H — H-Q11…H-Q15) The client's side of the conversation — the client and anyone from their household. Checked as every portal
 * request is (`portalActor`: the address, Live / Paused, the session, the Messages switch; a write is refused in a studio's preview), then the
 * home: one of this visitor's, with a project. The team hears it on the bell, at most once per conversation in 15 minutes while it waits
 * unread (G's quiet window). Portal actions revalidate no path — the page reads fresh on its own.
 * (parity map 2026-10-10 — UC-064 · UC-066 · UC-067) A home with no project yet is a lead's conversation (`lead_messages`): the client invited
 * to the portal writes from their page and the studio answers in Messages. Files beyond photos travel in pieces (up to 25 MB, Files ›
 * Messages), a voice note too. The team's own conversation never reaches this side. A member who muted the conversation hears no bell.
 */
type Refusal = { error: string }
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
const GONE = 'This conversation isn’t there any more'
const PREVIEW = 'This is a preview — nothing here is saved as the client’s'

/** Which home: a project (`projectId`), or a lead with no project yet (`leadId`). */
type Where = { projectId?: string | null; leadId?: string | null }
type Home = { visitor: PortalVisitor; p: typeof projects.$inferSelect | null; leadId: string; key: string }
async function forHome(slug: string, where: Where | string, write: boolean): Promise<Home | Refusal> {
  const who = await portalActor(slug, { write, section: 'messages' })
  if ('error' in who) return who
  const w: Where = typeof where === 'string' ? { projectId: where } : where ?? {}
  if (w.projectId) {
    const [p] = await db.select().from(projects).where(eq(projects.id, String(w.projectId))).limit(1)
    if (!p || p.deletedAt || !who.visitor.links.some((l) => l.leadId === p.leadId)) return { error: GONE }
    return { visitor: who.visitor, p, leadId: p.leadId, key: conversationKey('client', p.id) }
  }
  const leadId = String(w.leadId ?? '')
  if (!leadId || !who.visitor.links.some((l) => l.leadId === leadId)) return { error: GONE }
  const [lead] = await db.select({ deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead || lead.deletedAt) return { error: GONE }
  /* once Won the conversation carries on in the project's — the page reads it there */
  const [p] = await db.select().from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  if (p) return { visitor: who.visitor, p, leadId, key: conversationKey('client', p.id) }
  return { visitor: who.visitor, p: null, leadId, key: conversationKey('lead', leadId) }
}

export async function sendClientMessage(slug: string, input: Where & { body: string; photos?: string[]; files?: { fileId: string; durationMs?: number | null }[] }): Promise<{ line: ChatLine } | Refusal> {
  const c = await forHome(slug, input, true); if (isRefusal(c)) return c
  const body = typeof input?.body === 'string' ? input.body.replace(/\r\n/g, '\n').trim().slice(0, MESSAGE_MAX) : ''
  /* (UC-066) the files this person sent in pieces — this home's own, live */
  const asked = Array.isArray(input?.files) ? input.files.filter((f) => f && typeof f.fileId === 'string').slice(0, MESSAGE_FILES_MAX + 1) : []
  if (asked.length > MESSAGE_FILES_MAX) return { error: `Add up to ${MESSAGE_FILES_MAX} files at a time` }
  const found = asked.length ? await db.select().from(leadFiles).where(and(eq(leadFiles.leadId, c.leadId), inArray(leadFiles.id, asked.map((f) => f.fileId)), isNull(leadFiles.deletedAt))) : []
  if (found.length !== asked.length) return { error: 'A file didn’t arrive — send it again' }
  const files = asked.map((f) => {
    const row = found.find((x) => x.id === f.fileId)!
    const kind = messageFileKind(row.mime ?? '', row.name)
    return { fileId: row.id, kind, name: row.name, size: row.sizeBytes ?? 0, mime: row.mime ?? '', durationMs: kind === 'voice' && typeof f.durationMs === 'number' && Number.isFinite(f.durationMs) ? Math.min(VOICE_MAX_MS, Math.max(0, Math.round(f.durationMs))) : null }
  })
  const photos = await keepThreadPhotos(c.leadId, 'Messages', c.visitor.name, input?.photos, { max: MESSAGE_PHOTOS_MAX, dataMax: MESSAGE_PHOTO_DATA_MAX }); if (isRefusal(photos)) return photos
  if (!body && !photos.length && !files.length) return { error: 'Write your message first' }
  const now = new Date()
  const id = randomUUID()
  const src = (fid: string) => portalFileHref(slug, fid)
  let line: ChatLine
  if (c.p) {
    const row = { id, projectId: c.p.id, leadId: c.p.leadId, authorKind: 'client', authorId: c.visitor.homeownerId, authorName: c.visitor.name, body, photos: photos.length ? photos : null, createdAt: now, deletedAt: null, taskId: null, variationId: null, channel: 'client', attachments: files.length ? files : null, meta: null }   // (simplify round 2) a new message has made nothing yet · (parity map) the client's conversation
    await db.insert(projectMessages).values(row)
    await setReadMark('client', c.visitor.homeownerId, c.p.id, now)
    line = lineOf(row, src, new Map(), { fileSrc: src })
  } else {
    const attachments = [...photos.map((fileId) => ({ fileId, kind: 'photo' })), ...files]
    const row = { id, leadId: c.leadId, authorKind: 'client', authorId: c.visitor.homeownerId, authorName: c.visitor.name, body, attachments: attachments.length ? attachments : null, createdAt: now, deletedAt: null }
    await db.insert(leadMessages).values(row)
    await setReadMark('client', c.visitor.homeownerId, readIdOf('lead', c.leadId), now)
    line = lineOf(row, src, new Map(), { fileSrc: src })
  }
  /* the team's bell — once per conversation in 15 minutes (H-Q15); (UC-070) never to whoever muted it — (pending modules S34) one helper,
     shared with a client's WhatsApp reply (lib/notifications/inbound.ts) */
  await tellTeamOfClientMessage({ leadId: c.leadId, project: c.p ? { id: c.p.id, name: c.p.name } : null, key: c.key, from: c.visitor.name, gist: messageGist({ body, photos: photos.length, files }), now })
  return { line }
}

/** (UC-066) One piece of a file this person is sending — the last files it (Files › Messages) and answers its id for the message. */
export async function uploadClientMessageFile(slug: string, input: Where & { piece: FilePiece }): Promise<{ more: true } | { fileId: string; name: string; size: number; mime: string } | Refusal> {
  const c = await forHome(slug, input, true); if (isRefusal(c)) return c
  const piece = input?.piece
  return takeFilePiece(c.leadId, 'Messages', `client:${c.visitor.homeownerId}`, piece, { max: MESSAGE_FILE_MAX, maxPiece: FILE_PIECE + 8, tooBig: `${typeof piece?.name === 'string' ? piece.name : 'This file'} is over ${sizeWords(MESSAGE_FILE_MAX)} — a smaller file fits` })
}

/** A message by its id — a project's (never the team's) or a lead's — and the home it is in. */
async function messageOf(messageId: string) {
  const id = String(messageId ?? '')
  const [m] = await db.select().from(projectMessages).where(eq(projectMessages.id, id)).limit(1)
  if (m) return m.channel === 'team' ? null : { m, where: { projectId: m.projectId } as Where, table: 'project' as const }
  const [l] = await db.select().from(leadMessages).where(eq(leadMessages.id, id)).limit(1)
  return l ? { m: l, where: { leadId: l.leadId } as Where, table: 'lead' as const } : null
}
export async function removeClientMessage(slug: string, input: { messageId: string }): Promise<{ ok: true } | Refusal> {
  const got = await messageOf(input?.messageId)
  if (!got || got.m.deletedAt) return { error: 'This message isn’t there any more' }
  const c = await forHome(slug, got.where, true); if (isRefusal(c)) return c
  if (got.m.authorKind !== 'client' || got.m.authorId !== c.visitor.homeownerId) return { error: 'You can remove only your own messages' }
  if (got.table === 'project') await db.update(projectMessages).set({ deletedAt: new Date() }).where(eq(projectMessages.id, got.m.id))
  else await db.update(leadMessages).set({ deletedAt: new Date() }).where(eq(leadMessages.id, got.m.id))
  return { ok: true }
}
export async function restoreClientMessage(slug: string, input: { messageId: string }): Promise<{ ok: true } | Refusal> {
  const got = await messageOf(input?.messageId)
  if (!got) return { error: 'This message isn’t there any more' }
  const c = await forHome(slug, got.where, true); if (isRefusal(c)) return c
  if (got.m.authorKind !== 'client' || got.m.authorId !== c.visitor.homeownerId) return { error: 'You can remove only your own messages' }
  if (got.table === 'project') await db.update(projectMessages).set({ deletedAt: null }).where(eq(projectMessages.id, got.m.id))
  else await db.update(leadMessages).set({ deletedAt: null }).where(eq(leadMessages.id, got.m.id))
  return { ok: true }
}

/** Read up to now — the page calls it as the thread shows (a studio's preview marks nothing). */
export async function markClientChatRead(slug: string, input: Where): Promise<{ ok: true } | Refusal> {
  const c = await forHome(slug, input, true)
  if (isRefusal(c)) return c.error === PREVIEW ? { ok: true } : c
  await setReadMark('client', c.visitor.homeownerId, c.p ? c.p.id : readIdOf('lead', c.leadId))
  return { ok: true }
}

/** The conversations as they stand now (the page checks every few seconds), or one home's lines before `before` (Show earlier). */
export async function readClientChats(slug: string, input: Where & { before?: number | null } = {}): Promise<{ homes: PortalConversation[] } | { lines: ChatLine[]; more: boolean } | Refusal> {
  const src = (id: string) => portalFileHref(slug, id)
  if ((input?.projectId || input?.leadId) && input.before) {
    const c = await forHome(slug, input, false); if (isRefusal(c)) return c
    const r = c.p ? await chatLines(c.p.id, { before: Number(input.before), src, fileSrc: src, leadId: c.leadId }) : await leadChatLines(c.leadId, { before: Number(input.before), src, fileSrc: src })
    return { ...r, lines: forClient(r.lines, await clientFaces(slug, c.visitor)) }   // (pending modules S01 · S13) the team's faces through the portal's own address
  }
  const who = await portalActor(slug, { write: false, section: 'messages' })
  if ('error' in who) return who
  return { homes: await fetchPortalConversations(who.visitor, src, { faces: await clientFaces(slug, who.visitor) }) }
}
