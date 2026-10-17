import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projectRooms, renderJobs, studioMaterials, visualizerDesigns } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { gateLead, parseOwnStored, readShareLink } from '@/lib/visualizer/queries'
import { addressPath, LINK_CACHE, parseAssets, renderPicture, sendPicture, STUDIO_CACHE } from '@/lib/visualizer/images'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) an address without `?t=` is the studio's — behind sign-in

/* AI Visualizer (REG-673, audit §4.2) — the pictures a studio uploaded or the engine made, stored as data URLs, served as images so a
   page's payload carries addresses: /visualizer/img/room/{roomId} · v/{jobId}/{variantId} · m/{materialId} · d/{designId}/{swatchId} ·
   a/{roomId}/{assetId}. A stored public path (the sample rooms) redirects to itself.
   (audit 2026-09-26, critic §1) Every read is gated: a studio page's address answers to Who sees leads (a lead's design, or a personal copy
   of one); a client's address carries its link's token (`?t=`) and is served only while that link opens, and only for a picture on it —
   not after a Stop, the design's delete, the lead's return or delete, or the version's delete. Private caching only.
   (wave E, files-3 · critic-1) PRODUCTION: every address without `?t=` is the studio's and needs an authenticated session — a request with
   no session gets a 401 before these checks run. (pending modules S30) It does now: a signed-out browser's request without `?t=` gets its
   401 first (`signedOutResponse`); a browser that never signed in or out is the demo's own session (`DEMO_STANDING_SESSION`). */

export const dynamic = 'force-dynamic'
const notFound = () => new Response('Not found', { status: 404 })

/** The design a picture belongs to, by the address's own ids. */
async function designOf(kind: string, a: string): Promise<{ leadId: string | null; sourceLeadId: string | null } | null> {
  let designId: string | null = null
  if (kind === 'room' || kind === 'a') designId = (await db.select({ d: projectRooms.designId }).from(projectRooms).where(eq(projectRooms.id, a)))[0]?.d ?? null
  else if (kind === 'v') {
    const [j] = await db.select({ roomId: renderJobs.roomId }).from(renderJobs).where(eq(renderJobs.id, a))
    designId = j ? (await db.select({ d: projectRooms.designId }).from(projectRooms).where(eq(projectRooms.id, j.roomId)))[0]?.d ?? null : null
  } else if (kind === 'd') designId = a
  if (!designId) return null
  return (await db.select({ leadId: visualizerDesigns.leadId, sourceLeadId: visualizerDesigns.sourceLeadId }).from(visualizerDesigns).where(eq(visualizerDesigns.id, designId)))[0] ?? null
}

/** A studio member reads a picture of a design they may open; a studio material is the whole studio's. */
async function studioMayRead(kind: string, a: string): Promise<boolean> {
  if (kind === 'm') return true
  const d = await designOf(kind, a); if (!d) return false
  const gate = gateLead(d)
  return !gate || canOpenLead(await fetchViewer(), gate)
}
/** A client reads a picture only through an open link that shows it — a live version's picture, or its before: (verify round 1) the
    client's own room, the photo every design on the link is compared with. */
async function linkMayRead(token: string, path: string): Promise<boolean> {
  const r = await readShareLink(token)
  if (!r || r.state !== 'open') return false
  return r.live.some((v) => addressPath(v.imageUrl) === path || (!!v.beforeUrl && addressPath(v.beforeUrl) === path) || path === `/visualizer/img/room/${v.roomId}`)
}

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params
  const [kind, a, b] = key
  if (!kind || !a) return notFound()
  const url = new URL(req.url)
  const token = url.searchParams.get('t')
  if (!token) { const out = await signedOutResponse(); if (out) return out }
  const ok = token ? await linkMayRead(token, url.pathname) : await studioMayRead(kind, a)
  if (!ok) return notFound()
  const cache = token ? LINK_CACHE : STUDIO_CACHE
  if (kind === 'room') {
    const [r] = await db.select({ url: projectRooms.originalImageUrl }).from(projectRooms).where(eq(projectRooms.id, a))
    return sendPicture(r?.url, req.url, cache)
  }
  if (kind === 'v' && b) return sendPicture(await renderPicture(a, Number(b)), req.url, cache)
  if (kind === 'm' && !token) {
    const [m] = await db.select({ url: studioMaterials.imageUrl }).from(studioMaterials).where(eq(studioMaterials.id, a))
    return sendPicture(m?.url, req.url, cache)
  }
  if (kind === 'd' && b && !token) {
    const [d] = await db.select({ customJson: visualizerDesigns.customJson }).from(visualizerDesigns).where(eq(visualizerDesigns.id, a))
    return sendPicture(parseOwnStored(d?.customJson ?? null).find((s) => s.id === b)?.imageUrl, req.url, cache)   // (F198) a removed swatch keeps its picture for its Undo
  }
  if (kind === 'a' && b && !token) {
    const [r] = await db.select({ assetsJson: projectRooms.assetsJson }).from(projectRooms).where(eq(projectRooms.id, a))
    return sendPicture(parseAssets(r?.assetsJson)[b], req.url, cache)
  }
  return notFound()
}
