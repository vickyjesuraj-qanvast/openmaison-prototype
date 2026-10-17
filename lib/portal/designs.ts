import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, members, renderConsultationRequests, renderShareLinks } from '@/lib/db/schema'
import { readShareLink } from '@/lib/visualizer/queries'
import { firstName, portalPath } from './model'
import { placeOf } from './queries'
import type { PortalVisitor } from './session'

/*
 * (Projects round 9 — Q-45 "Designs: rooms you share from the Visualizer") The portal's Designs: the client's shared renders, gathered from
 * the Visualizer's share links on their homes. No studio note, no cost, no member's own record.
 * (gaps build D, item 1 — M-06; 1.0's `homeowner_shared_assets` never expired) A design shared stays on the portal for good: every link that
 * has not ENDED is listed — the studio's Stop, the design in the trash, the lead returned or deleted, or every version on it deleted end it
 * (`readShareLink`'s `ended`) — whatever its 7-day expiry, which stays on the no-login `/renders/[token]` page only. Each picture travels
 * through the portal's own session-checked route (`/my/<address>/design/<link>/<n>`, the snapshot's n-th version), so an expired link's
 * pictures still open for the signed-in client and never for anyone holding the old link. `open` says whether the link itself still opens
 * (its card offers "Mark what you like" there); an expired one's pictures open in the portal's viewer.
 */

export type PortalDesignVersion = { key: string; room: string; label: string; imageUrl: string; favourite: boolean
  /** (gaps build D, item 1) what the version shows, as the link lists it ("Walls · Nippon Paint Lily White") */ materials?: string[] }
export type PortalDesignLink = {
  token: string
  /** (gaps build D, item 1) the share link's id — the portal's picture route names it */ id: string
  /** (gaps build D, item 1) the no-login link still opens (its 7 days not run out) — else the pictures stay here and open in the viewer */ open: boolean
  designId: string
  sharedAt: number
  expiresAt: number
  /** Who shared it — their first name ("From Germaine"). */
  sender: string | null
  message: string | null
  rooms: number
  versions: PortalDesignVersion[]
}
export type PortalDesignsHome = { homeId: string; leadId: string; title: string; links: PortalDesignLink[] }

export async function fetchPortalDesigns(visitor: PortalVisitor, slug: string): Promise<PortalDesignsHome[]> {
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!leadIds.length) return []
  const [leadRows, shares] = await Promise.all([
    db.select({ id: leads.id, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress }).from(leads).where(inArray(leads.id, leadIds)),
    db.select().from(renderShareLinks).where(and(inArray(renderShareLinks.leadId, leadIds), isNull(renderShareLinks.revokedAt))).orderBy(desc(renderShareLinks.createdAt)),
  ])
  /* (gaps build D, item 1) every link that has not ended — open or past its 7 days alike */
  const reads = (await Promise.all(shares.map(async (s) => ({ s, r: await readShareLink(s.token) })))).filter((x) => !!x.r && !x.r.ended && x.r.live.length)
  const linkIds = reads.map((x) => x.s.id)
  const by = [...new Set(reads.map((x) => x.s.createdBy).filter((x): x is string => !!x))]
  const [favs, senders] = await Promise.all([
    linkIds.length ? db.select({ link: renderConsultationRequests.shareLinkId, key: renderConsultationRequests.versionKey, at: renderConsultationRequests.createdAt }).from(renderConsultationRequests)
      .where(and(inArray(renderConsultationRequests.shareLinkId, linkIds), eq(renderConsultationRequests.kind, 'favourite'))) : Promise.resolve([]),
    by.length ? db.select({ id: members.id, name: members.name }).from(members).where(inArray(members.id, by)) : Promise.resolve([]),
  ])
  return visitor.links.map((l) => {
    const lead = leadRows.find((x) => x.id === l.leadId)
    const place = placeOf(lead?.propertyAddress ?? lead?.leadAddress)
    const links: PortalDesignLink[] = reads.filter((x) => x.s.leadId === l.leadId).map(({ s, r }) => {
      const fav = favs.filter((f) => f.link === s.id).sort((a, b) => b.at.getTime() - a.at.getTime())[0]?.key ?? null
      const sender = senders.find((m) => m.id === s.createdBy)?.name ?? null
      const snap = snapshotKeys(s.snapshot)
      return {
        token: s.token, id: s.id, open: r!.state === 'open', designId: s.designId, sharedAt: s.createdAt.getTime(), expiresAt: s.expiresAt.getTime(), sender: sender ? firstName(sender) : null, message: s.message,
        rooms: new Set(r!.live.map((v) => v.roomId)).size,
        versions: r!.live.map((v) => ({ key: v.key, room: v.clientRoom, label: v.clientLabel, imageUrl: portalDesignPicture(slug, s.id, snap.indexOf(v.key)), favourite: v.key === fav,
          materials: v.materials.map((m) => `${m.label} · ${m.material}`).slice(0, 6) })),
      }
    })
    return { homeId: l.linkId, leadId: l.leadId, title: place ? `Your home at ${place}` : lead?.propertyType ?? 'Your home', links }
  })
}

/** (gaps build D, item 1) The snapshot's version keys in their stored order — the n of the portal's picture address. */
export function snapshotKeys(raw: string): string[] {
  try { const v = (JSON.parse(raw) as { versions?: { key?: unknown }[] }).versions; return Array.isArray(v) ? v.map((x) => (typeof x?.key === 'string' ? x.key : '')) : [] } catch { return [] }
}
/** (gaps build D, item 1) A shared design's picture through the portal: `/my/<address>/design/<link id>/<n>`. */
export const portalDesignPicture = (slug: string, linkId: string, n: number) => portalPath(slug, `design/${encodeURIComponent(linkId)}/${Math.max(0, n)}`)

/**
 * (gaps build D, item 1) The picture a portal address names, when this visitor may see it: the link on one of their homes, not ended (open or
 * expired alike — M-06), the n-th version of its snapshot still live. null = not found (never why).
 */
export async function portalDesignPictureFor(visitor: PortalVisitor, linkId: string, n: number): Promise<string | null> {
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!leadIds.length || !Number.isInteger(n) || n < 0) return null
  const [s] = await db.select().from(renderShareLinks).where(and(eq(renderShareLinks.id, linkId), inArray(renderShareLinks.leadId, leadIds), isNull(renderShareLinks.revokedAt))).limit(1)
  if (!s) return null
  const key = snapshotKeys(s.snapshot)[n]
  if (!key) return null
  const r = await readShareLink(s.token)
  if (!r || r.ended) return null
  const v = r.live.find((x) => x.key === key)
  return v ? v.imageUrl : null
}
