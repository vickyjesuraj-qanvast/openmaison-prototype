import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFileImages, leadFileThumbs } from '@/lib/db/schema'
import { serviceSlot } from '@/lib/services/slots'   // (pending modules S34)

/*
 * (gaps build E, item 1) The one storage path for a lead's files — Files' uploads, an update's media, a choice's picture, a payment's proof, a
 * render saved to Files. Every file keeps its own bytes beside its row (`lead_file_images`, a data URL: the table kept REG-684's name when it
 * began with pictures), and a file that is not a picture keeps a picture of itself apart (`lead_file_thumbs`: a PDF's first page, a video's
 * first frame). Every route that hands a file out — the studio's /files/raw, /files/img and /files/thumb, a project's media, the client's
 * signed /f link and the portal's /my/<address>/file — sends it through `sendStored`, with ranges (Safari asks for them before it plays a
 * video) and the file's own name.
 *
 * PRODUCTION: object storage replaces the two tables (map 24 §6) — keep `keepBytes` · `keepThumb` · `storedBytes` · `storedThumb` ·
 * `copyStored` as the seam and swap their bodies; the rows' `thumb` addresses and the routes stay as they are.
 * (pending modules S34) …through one slot, `setFileStore` (lib/services/slots.ts 'storage'): once a real store is plugged in, `keepBytes` /
 * `keepThumb` hand it the data URL and keep only its reference in the table (`store:<ref>` in `data`), and `storedBytes` / `storedThumb`
 * ask the store for it back — so every check that a file "kept its bytes" (a row exists), every route and every copy stay as they are, and
 * the rows written before keep working (their data URLs read as they are). Every writer and reader of the two tables goes through these
 * five functions — the direct inserts of choices, payment proofs, update media and filed renders, and /files/img's read, were moved onto
 * them here. A file deleted for good takes its row (the table's cascade); its object is the store's to expire (`remove`, when the store has
 * one, is the developers' sweep's). The other stores of bytes — Company's pictures, fonts, renders, floor plans, money papers, chat files,
 * contract templates — are listed with their own functions in lib/services/registry.ts ('storage').
 */
export type FileStore = {
  name: string
  /** Keep one file's bytes (or its picture) — a data URL in — and answer the store's own reference for it. */
  put(o: { fileId: string; part: 'bytes' | 'thumb'; dataUrl: string }): Promise<string>
  /** The data URL kept under a reference, or null when the store has none. */
  get(ref: string): Promise<string | null>
  remove?(ref: string): Promise<void>
}
const IN_TABLES: FileStore = { name: 'database', put: async (o) => o.dataUrl, get: async () => null }
const slot = serviceSlot<FileStore>('storage', IN_TABLES)
/** PRODUCTION: plug object storage in once, at start-up (lib/services/install.ts). */
export function setFileStore(s: FileStore): void { slot.set(s) }
export const fileStoreIsStandIn = (): boolean => slot.standIn()
const REF = 'store:'
/** What the table keeps: the data URL itself (the stand-in), or the store's reference to it. */
async function toKept(fileId: string, part: 'bytes' | 'thumb', dataUrl: string): Promise<string> {
  if (slot.standIn()) return dataUrl
  return `${REF}${await slot.use().put({ fileId, part, dataUrl })}`
}
/** What the table kept, as the data URL — a reference asks the store. */
async function fromKept(v: string | null | undefined): Promise<string | null> {
  if (!v) return null
  return v.startsWith(REF) ? slot.use().get(v.slice(REF.length)) : v
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type W = typeof db | Tx

/** A data URL: its type and its base64 body. */
export const DATA_URL = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i
/** A picture the browser drew (a JPEG, PNG or WebP) — what a thumbnail is. */
export const PICTURE_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
/** The bytes a data URL carries — exactly (its base64 length, less the padding). */
export const dataUrlSize = (u: string) => { const b64 = u.slice(u.indexOf(',') + 1); return Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0) }

/** Keep a file's own bytes (a data URL), replacing any kept before. */
export async function keepBytes(w: W, fileId: string, dataUrl: string): Promise<void> {
  const data = await toKept(fileId, 'bytes', dataUrl)
  await w.insert(leadFileImages).values({ fileId, data }).onConflictDoUpdate({ target: leadFileImages.fileId, set: { data } })
}
/** (pending modules S34) Keep a file's bytes unless it kept some already (a render filed twice keeps its first). */
export async function keepBytesOnce(w: W, fileId: string, dataUrl: string): Promise<void> {
  const [have] = await w.select({ fileId: leadFileImages.fileId }).from(leadFileImages).where(eq(leadFileImages.fileId, fileId)).limit(1)
  if (!have) await w.insert(leadFileImages).values({ fileId, data: await toKept(fileId, 'bytes', dataUrl) }).onConflictDoNothing()
}
/** Keep the picture of a file that is not one (a PDF's first page, a video's first frame) — a JPEG / PNG / WebP data URL. */
export async function keepThumb(w: W, fileId: string, dataUrl: string): Promise<void> {
  const data = await toKept(fileId, 'thumb', dataUrl)
  await w.insert(leadFileThumbs).values({ fileId, data }).onConflictDoUpdate({ target: leadFileThumbs.fileId, set: { data } })
}
export async function storedBytes(fileId: string, w: W = db): Promise<string | null> {
  const [r] = await w.select({ data: leadFileImages.data }).from(leadFileImages).where(eq(leadFileImages.fileId, fileId)).limit(1)
  return fromKept(r?.data)
}
export async function storedThumb(fileId: string, w: W = db): Promise<string | null> {
  const [r] = await w.select({ data: leadFileThumbs.data }).from(leadFileThumbs).where(eq(leadFileThumbs.fileId, fileId)).limit(1)
  return fromKept(r?.data)
}
/** A copy keeps its own bytes and picture (Duplicate). Answers what was copied, so the copy's row can point at its own addresses. */
export async function copyStored(w: W, fromId: string, toId: string): Promise<{ bytes: boolean; thumb: boolean }> {
  const [bytes, thumb] = await Promise.all([storedBytes(fromId, w), storedThumb(fromId, w)])
  if (bytes) await keepBytes(w, toId, bytes)
  if (thumb) await keepThumb(w, toId, thumb)
  return { bytes: !!bytes, thumb: !!thumb }
}

/** The addresses a file's row carries: its picture (a picture's own bytes), its thumbnail (anything else's picture), its bytes. */
export const imageAddress = (fileId: string) => `/files/img/${fileId}`
export const thumbAddress = (fileId: string) => `/files/thumb/${fileId}`
export const rawAddress = (fileId: string) => `/files/raw/${fileId}`

const INLINE_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf|video\/[a-z0-9.+-]+|audio\/[a-z0-9.+-]+)$/

/**
 * A stored data URL as the response every file route gives: its bytes under its own type, inline (or as a download) under the file's name,
 * a byte range when one is asked for. Null when nothing usable is stored — the caller says not found (or sends a stand-in).
 */
export function sendStored(stored: string | null | undefined, req: Request, o: { name: string; cache: string; download?: boolean }): Response | null {
  const m = stored ? DATA_URL.exec(stored) : null
  if (!m) return null
  const bytes = Buffer.from(m[2]!, 'base64')
  const type = m[1]!.toLowerCase()
  /* only what a browser shows without running it opens in place — a picture, a PDF, a video, a sound; anything else (a page, an SVG, a
     script, an Office file) always arrives as a download, so an upload can never run as the app */
  const inline = !o.download && INLINE_TYPES.test(type)
  const head = {
    'Content-Type': type, 'Cache-Control': o.cache, 'Accept-Ranges': 'bytes',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(o.name)}`,
    'X-Content-Type-Options': 'nosniff',
  }
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '')
  if (range && (range[1] || range[2])) {
    const size = bytes.length
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    return new Response(bytes.subarray(start, end + 1), { status: 206, headers: { ...head, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } })
  }
  return new Response(bytes, { headers: { ...head, 'Content-Length': String(bytes.length) } })
}

/** What a file with no kept bytes still shows: a stand-in picture the demo carries in /public (its `thumb`), else nothing. */
export const standInOf = (thumb: string | null | undefined): string | null =>
  thumb && thumb.startsWith('/') && !thumb.startsWith('/files/') && !thumb.startsWith('/projects/') ? thumb : null
