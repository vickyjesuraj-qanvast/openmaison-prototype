import 'server-only'   // libSQL never reaches the browser
import { randomBytes, randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { leadFileRenders, renderShareLinks, visualizerDesigns } from '@/lib/db/schema'
import { SHARE_DAYS } from '@/lib/visualizer/policy'
import { leadClosed, readShareLink } from '@/lib/visualizer/queries'
import { buildShareVersions } from '@/lib/visualizer/share-build'
import { snapshotKeys } from './designs'

/*
 * (pending modules S02 — 1.0 H-82…H-84: Files › a render › "Show to homeowner" also shared it to the portal's Renders) A render in Files is a
 * version of an AI Visualizer design (`lead_file_renders`). Shown to the client, it lands on the portal's Files as every shown file does —
 * and, as in 1.0, on their **Designs** too, where they can mark what they like and pin a note: through a share link of its own, one version,
 * made here (`render_share_links.file_id`). 1.0 was idempotent on (link, picture) and so is this: a version already on a live share of the
 * lead's (shared from the Visualizer, or shown before) adds nothing. Stop showing stops this link only — a Visualizer share is the
 * Visualizer's to stop. 1.0 dropped the client's likes and pins on a hide (H-84, "accepted"); 2.0 keeps them: showing it again reopens the
 * same link, so they come back with it.
 */

/** Put each render among `fileIds` on the client's Designs (`shown`) or take it off. Answers how many of them are on Designs now. */
export async function syncRenderShares(leadId: string, fileIds: string[], shown: boolean, actorId: string | null): Promise<number> {
  if (!fileIds.length) return 0
  const renders = await db.select().from(leadFileRenders).where(inArray(leadFileRenders.fileId, fileIds))
  if (!renders.length) return 0
  if (!shown) {
    const live = await db.select({ id: renderShareLinks.id, token: renderShareLinks.token }).from(renderShareLinks)
      .where(and(inArray(renderShareLinks.fileId, renders.map((r) => r.fileId)), eq(renderShareLinks.leadId, leadId), isNull(renderShareLinks.revokedAt)))
    if (live.length) {
      await db.update(renderShareLinks).set({ revokedAt: new Date() }).where(inArray(renderShareLinks.id, live.map((l) => l.id)))
      for (const l of live) revalidatePath(`/renders/${l.token}`)
    }
    return 0
  }
  if (await leadClosed(leadId)) return 0
  const shares = await db.select().from(renderShareLinks).where(eq(renderShareLinks.leadId, leadId))
  let on = 0
  for (const r of renders) {
    const [d] = await db.select({ deletedAt: visualizerDesigns.deletedAt }).from(visualizerDesigns).where(eq(visualizerDesigns.id, r.designId)).limit(1)
    if (!d || d.deletedAt) continue
    /* already on a live share of the lead's that has not ended — the Visualizer's, or this file's own */
    const carrying = shares.filter((s) => !s.revokedAt && snapshotKeys(s.snapshot).includes(r.renderKey))
    let already = false
    for (const s of carrying) { const read = await readShareLink(s.token); if (read && !read.ended && read.live.some((v) => v.key === r.renderKey)) { already = true; break } }
    if (already) { on++; continue }
    const now = new Date(), expiresAt = new Date(now.getTime() + SHARE_DAYS * 86_400_000)
    /* this file's own link, stopped by a Stop showing: the same link again, the client's favourite and pins with it */
    const own = shares.find((s) => s.fileId === r.fileId && snapshotKeys(s.snapshot).includes(r.renderKey))
    if (own) {
      await db.update(renderShareLinks).set({ revokedAt: null, expiresAt: own.expiresAt.getTime() > now.getTime() ? own.expiresAt : expiresAt }).where(eq(renderShareLinks.id, own.id))
      revalidatePath(`/renders/${own.token}`); on++; continue
    }
    const { versions } = await buildShareVersions(r.designId, [r.renderKey])
    if (!versions.length) continue   // the version was deleted in the Visualizer — the file stays a file
    await db.insert(renderShareLinks).values({ id: randomUUID(), token: randomBytes(9).toString('base64url'), designId: r.designId, leadId, snapshot: JSON.stringify({ versions }), message: null,
      expiresAt, viewCount: 0, lastViewedAt: null, sentVia: null, createdBy: actorId, createdAt: now, revokedAt: null, fileId: r.fileId })
    on++
  }
  return on
}
