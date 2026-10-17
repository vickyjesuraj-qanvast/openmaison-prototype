import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversationFiles, leadFiles } from '@/lib/db/schema'
import { PICTURE_URL, dataUrlSize, imageAddress, keepBytes } from '@/lib/leads/file-store'
import { fileKindOf, mimeFor } from '@/lib/leads/file-model'   // (parity map, UC-066)

/*
 * (gaps build H — H-Q7 · H-Q12) The photos sent with a ticket or a message — by the client on their portal or by the studio — kept as files of
 * the project with their bytes (E's storage, lib/leads/file-store.ts) in a folder of their own (Files › Tickets, Files › Messages, made on
 * first use), named by who sent them and when — G's way for the floor plan's photos. A photo travels to the action inside one object.
 */
type Refusal = { error: string }

/** The project's top-level folder of that name — found, or made. */
export async function threadFolder(leadId: string, name: 'Tickets' | 'Messages'): Promise<string> {
  const [have] = await db.select({ id: leadFiles.id }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt), eq(leadFiles.name, name))).limit(1)
  if (have) return have.id
  const id = randomUUID(); const now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name, thumb: null, createdAt: now, parentId: null, ownerId: null, sizeBytes: null, mime: null, updatedAt: now })
  return id
}

/** Keep the photos (data URLs, as the browser shrank them) and answer their file ids — or the refusal that says what was wrong. */
export async function keepThreadPhotos(leadId: string, folder: 'Tickets' | 'Messages', who: string, photos: unknown, o: { max: number; dataMax: number }): Promise<string[] | Refusal> {
  const list = Array.isArray(photos) ? photos.filter((x): x is string => typeof x === 'string') : []
  if (list.length > o.max) return { error: `Add up to ${o.max} photos at a time` }
  if (list.some((d) => !PICTURE_URL.test(d) || d.length > o.dataMax)) return { error: 'A photo didn’t read — pick it again' }
  if (!list.length) return []
  const parent = await threadFolder(leadId, folder)
  const now = new Date()
  const ids: string[] = []
  await db.transaction(async (tx) => {
    for (const [i, data] of list.entries()) {
      const id = randomUUID()
      const ext = /^data:image\/png/.test(data) ? 'png' : /^data:image\/webp/.test(data) ? 'webp' : 'jpg'
      const name = `Photo from ${who} ${now.toISOString().slice(0, 10)}${list.length > 1 ? ` (${i + 1})` : ''}.${ext}`
      await tx.insert(leadFiles).values({ id, leadId, kind: 'image', name, thumb: imageAddress(id), createdAt: now, parentId: parent, ownerId: null, sizeBytes: dataUrlSize(data), mime: `image/${ext === 'jpg' ? 'jpeg' : ext}`, updatedAt: now })
      await keepBytes(tx, id, data)
      ids.push(id)
    }
  })
  return ids
}

/** The live files among these ids that belong to the lead (a photo trashed from Files leaves the thread's tile out). */
export async function liveFileIds(leadId: string, ids: readonly string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  const rows = await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, leadId), inArray(leadFiles.id, [...ids]), isNull(leadFiles.deletedAt)))
  return new Set(rows.map((r) => r.id))
}

/* ── (parity map 2026-10-10, UC-066 · UC-067) a file in a message — a PDF, a document, a sheet, a video, a voice note — up to 25 MB ───────────
   A file that size can't ride one action (the body stops at 12 MB, next.config.ts), so the browser sends it in pieces (`FILE_PIECE` characters
   of base64 each, in order) and the last piece files it: one row in Files › Messages with its bytes (E's storage). The pieces wait in this
   server's memory for ten minutes at most, keyed by the sender and the upload. PRODUCTION: object storage's multipart upload replaces the
   pieces (map 24 §6) — the action's shape stays. */
type Pieces = { owner: string; name: string; mime: string; size: number; parts: string[]; at: number }
const PIECES = new Map<string, Pieces>()
const PIECE_TTL = 10 * 60_000
const B64 = /^[A-Za-z0-9+/=]*$/
const MIME = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i
const sweepPieces = (now: number) => { for (const [k, v] of PIECES) if (now - v.at > PIECE_TTL) PIECES.delete(k) }

export type FilePiece = { upload: string; index: number; total: number; name: string; mime: string; size: number; piece: string }
/** (pending modules S26) One piece taken: `{ more: true }` until the last, then the whole file as a data URL (its name, type and size) — for the
    caller to file where its conversation keeps files (a lead's Files › Messages, or a members' conversation's own). */
type Landed = { name: string; mime: string; data: string; bytes: number }
function takePiece(owner: string, p: FilePiece, o: { max: number; tooBig: string; maxPiece: number }): { more: true } | Landed | Refusal {
  const now = Date.now()
  sweepPieces(now)
  const upload = typeof p?.upload === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(p.upload) ? p.upload : null
  const index = Number(p?.index), total = Number(p?.total), size = Number(p?.size)
  const name = (typeof p?.name === 'string' ? p.name : '').replace(/[\\/]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 160) || 'File'
  const bare = typeof p?.mime === 'string' ? p.mime.split(';')[0]!.trim() : ''   // a recorder's "audio/webm;codecs=opus" keeps its type
  const mime = MIME.test(bare) ? bare.toLowerCase() : 'application/octet-stream'
  const piece = typeof p?.piece === 'string' ? p.piece : ''
  if (!upload || !Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > 12 || index < 0 || index >= total) return { error: 'This file didn’t read — pick it again' }
  if (!Number.isFinite(size) || size <= 0) return { error: 'This file is empty — pick another' }
  if (size > o.max) return { error: o.tooBig }
  if (piece.length > o.maxPiece || !B64.test(piece)) return { error: 'This file didn’t read — pick it again' }
  if (/^text\/html|image\/svg|application\/(x-)?javascript/i.test(mime)) return { error: 'A page or a script can’t go in a message — send a PDF or a picture instead' }
  const key = `${owner}:${upload}`
  const have = PIECES.get(key)
  if (index === 0) PIECES.set(key, { owner, name, mime, size, parts: [piece], at: now })
  else if (!have || have.parts.length !== index) { PIECES.delete(key); return { error: 'Part of the file went missing on the way — send it again' } }
  else { have.parts.push(piece); have.at = now }
  const got = PIECES.get(key)!
  if (got.parts.length < total) return { more: true }
  PIECES.delete(key)
  const data = `data:${got.mime};base64,${got.parts.join('')}`
  const bytes = dataUrlSize(data)
  if (bytes > o.max) return { error: o.tooBig }
  const filed = got.mime.startsWith('audio/') && !/\.[a-z0-9]{2,4}$/i.test(got.name) ? `${got.name}.webm` : got.name
  return { name: filed, mime: got.mime, data, bytes }
}
/**
 * Take one piece of a file. Answers `{ more: true }` until the last, then the file's id. `owner` is who sends it (a member's id, a client's
 * homeowner id), so nobody else finishes their upload; `o.max` is the size cap. A refusal says what was wrong.
 */
export async function takeFilePiece(leadId: string, folder: 'Messages', owner: string, p: FilePiece, o: { max: number; tooBig: string; maxPiece: number }): Promise<{ more: true } | { fileId: string; name: string; size: number; mime: string } | Refusal> {
  const got = takePiece(owner, p, o)
  if ('more' in got || 'error' in got) return got
  const parent = await threadFolder(leadId, folder)
  const id = randomUUID(); const at = new Date()
  const kind = fileKindOf(got.name, mimeFor(got.name, got.mime))   // the house kinds — a voice note files as a document that plays
  await db.transaction(async (tx) => {
    await tx.insert(leadFiles).values({ id, leadId, kind, name: got.name, thumb: null, createdAt: at, parentId: parent, ownerId: null, sizeBytes: got.bytes, mime: got.mime, updatedAt: at })
    await keepBytes(tx, id, got.data)
  })
  return { fileId: id, name: got.name, size: got.bytes, mime: got.mime }
}

/* ── (pending modules S26) a members' conversation keeps its own files — it belongs to no lead ───────────────────────────────────── */
/** Keep a members' conversation's photos (data URLs) with it, and answer their file ids — the thread's own rule, its own store. */
export async function keepChatPhotos(conversationId: string, who: { id: string; name: string }, photos: unknown, o: { max: number; dataMax: number }): Promise<string[] | Refusal> {
  const list = Array.isArray(photos) ? photos.filter((x): x is string => typeof x === 'string') : []
  if (list.length > o.max) return { error: `Add up to ${o.max} photos at a time` }
  if (list.some((d) => !PICTURE_URL.test(d) || d.length > o.dataMax)) return { error: 'A photo didn’t read — pick it again' }
  if (!list.length) return []
  const now = new Date()
  const ids: string[] = []
  await db.transaction(async (tx) => {
    for (const [i, data] of list.entries()) {
      const id = randomUUID()
      const ext = /^data:image\/png/.test(data) ? 'png' : /^data:image\/webp/.test(data) ? 'webp' : 'jpg'
      await tx.insert(conversationFiles).values({ id, conversationId, name: `Photo from ${who.name} ${now.toISOString().slice(0, 10)}${list.length > 1 ? ` (${i + 1})` : ''}.${ext}`, mime: `image/${ext === 'jpg' ? 'jpeg' : ext}`, sizeBytes: dataUrlSize(data), createdBy: who.id, createdAt: now, data })
      ids.push(id)
    }
  })
  return ids
}
/** One piece of a file for a members' conversation — the last one keeps it with the conversation and answers its id. */
export async function takeChatFilePiece(conversationId: string, owner: string, p: FilePiece, o: { max: number; tooBig: string; maxPiece: number }): Promise<{ more: true } | { fileId: string; name: string; size: number; mime: string } | Refusal> {
  const got = takePiece(owner, p, o)
  if ('more' in got || 'error' in got) return got
  const id = randomUUID()
  await db.insert(conversationFiles).values({ id, conversationId, name: got.name, mime: got.mime, sizeBytes: got.bytes, createdBy: owner, createdAt: new Date(), data: got.data })   // the bytes on the row (schema's note)
  return { fileId: id, name: got.name, size: got.bytes, mime: got.mime }
}
