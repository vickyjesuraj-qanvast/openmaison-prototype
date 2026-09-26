import { createHash } from 'node:crypto'
import type { Pending } from './model'

/*
 * AI Visualizer — the picture store's addresses and rules (audit 2026-09-26), with no database: what the actions, the routes, the queries
 * and the demo repair share. A picture the studio uploads or the engine makes is a data URL kept beside its record, never inside the JSON
 * the pages read: a version's in `render_images` (F213), a reference or piece photo in its room's `assets_json` (F200), a room photo in its
 * row, a filed render in `lead_file_images` (F093). Pages and snapshots carry addresses under /visualizer/img; the route serves each one
 * only to whoever may see it (critic §1). Server-side (node:crypto); the database reads are lib/visualizer/images.ts.
 */

export const isDataImage = (u: unknown): u is string => typeof u === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u)
/** A version's address — what `variants_json` keeps once its picture is stored beside it. */
export const renderAddress = (jobId: string, variantId: number) => `/visualizer/img/v/${jobId}/${variantId}`
export const isAddress = (u: string | null | undefined) => !!u && u.startsWith('/visualizer/img/')

/** A data URL's bytes. */
export const dataUrlBytes = (u: string) => Math.round((u.length - u.indexOf(',') - 1) * 0.75)

/* ── a room's reference and piece photos (F200) ── */
export type RoomAssets = Record<string, string>
export const parseAssets = (raw: string | null | undefined): RoomAssets => {
  try { const v = JSON.parse(raw ?? '{}') as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, string] => isDataImage(e[1]))) : {} } catch { return {} }
}
/** Same picture, same id — an autosave that sends a picture again stores nothing new. */
export const assetIdOf = (dataUrl: string) => `a${createHash('sha256').update(dataUrl).digest('hex').slice(0, 15)}`   // never all digits: keys keep their order
export const assetAddress = (roomId: string, id: string) => `/visualizer/img/a/${roomId}/${id}`
const ASSET_CAP = 3_000_000   // a reference (900 px) or a piece photo (600 px) is far below it
const ASSET_KEEP = 24         // the newest pictures a room keeps once the picks no longer point at them (Undo may bring one back)

/**
 * The picks with every picture lifted into the room's store: a reference's `url` and a piece's `refImage` leave as addresses. An address of
 * another room, or anything that is not a picture, is dropped. Returns what to write (`changed` false when the store needs no write).
 */
export function liftPictures(roomId: string, p: Pending, stored: RoomAssets): { pending: Pending; assets: RoomAssets; changed: boolean } {
  const assets: RoomAssets = { ...stored }
  let changed = false
  const own = (u: string) => u.startsWith(`/visualizer/img/a/${roomId}/`) && !!assets[u.slice(u.lastIndexOf('/') + 1)]
  const lift = (u: string | null | undefined): string | null => {
    if (!u) return null
    if (isDataImage(u)) {
      if (u.length > ASSET_CAP) return null
      const id = assetIdOf(u)
      if (!assets[id]) { assets[id] = u; changed = true }
      return assetAddress(roomId, id)
    }
    if (own(u)) return u
    return /^\/visualizer\/(samples|demo)\/[a-z0-9/-]+\.jpg$/.test(u) ? u : null   // a sample's own picture stays a public path
  }
  const refs = p.transfer.refs.flatMap((r) => { const url = lift(r.url); return url ? [{ ...r, url }] : [] })
  const furniture = Object.fromEntries(Object.entries(p.furniture).map(([id, f]) => [id, f.refImage ? { ...f, refImage: lift(f.refImage) } : f]))
  /* keep what the picks point at, and the newest others up to the cap */
  const used = new Set([...refs.map((r) => r.url), ...Object.values(furniture).map((f) => f.refImage)].filter((u): u is string => !!u).map((u) => u.slice(u.lastIndexOf('/') + 1)))
  const ids = Object.keys(assets)
  const spare = ids.filter((id) => !used.has(id))
  if (spare.length > ASSET_KEEP) { for (const id of spare.slice(0, spare.length - ASSET_KEEP)) delete assets[id]; changed = true }
  return { pending: { ...p, transfer: { ...p.transfer, refs }, furniture }, assets, changed }
}

/* ── serving ── */
/** A client's copy of an address on their link: the route checks the link, not a session (critic §1). */
export function withToken(url: string | null, token: string): string | null {
  if (!url || !isAddress(url)) return url
  return `${url}${url.includes('?') ? '&' : '?'}t=${encodeURIComponent(token)}`
}
export const addressPath = (url: string) => url.split('?')[0]!
/** Pictures a studio member reads: private to their browser, and an address never changes its picture. */
export const STUDIO_CACHE = 'private, max-age=31536000, immutable'
/** Pictures read through a client's link: private, and short — a stopped link stops serving them soon after. */
export const LINK_CACHE = 'private, max-age=300'

/** A stored picture as a response: a data URL as its bytes, a public path as a redirect; an address is never its own picture. */
export function sendPicture(stored: string | null | undefined, base: string, cache: string): Response {
  if (!stored || isAddress(stored)) return new Response('Not found', { status: 404 })
  if (stored.startsWith('/')) return Response.redirect(new URL(stored, base), 307)
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(stored)
  if (!m) return new Response('Not found', { status: 404 })
  return new Response(Buffer.from(m[2]!, 'base64'), { headers: { 'Content-Type': m[1]!, 'Cache-Control': cache } })
}
