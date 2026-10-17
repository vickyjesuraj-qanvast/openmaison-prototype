import 'server-only'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, members } from '@/lib/db/schema'
import { photoIdOf, type ClientFaces } from '@/lib/company/member-photo'
import type { PortalVisitor } from './session'

/*
 * (pending modules S13 — S01's note) The faces a client's portal may show: the photos of the members on the client's own homes (each home's
 * lead members — a project's team is its lead's), never anyone else's. One rule for the page that draws them (`clientFaces` → `forClient`)
 * and for the route that serves them (app/my/[slug]/face/[id] → `isClientFace`), so a face a page draws always opens, and nothing else does.
 */

/** The pictures of the client's own team — the members on any of the visitor's homes who have a photo of their own. */
async function teamPictures(visitor: Pick<PortalVisitor, 'links'>): Promise<Set<string>> {
  const leadIds = [...new Set(visitor.links.map((l) => l.leadId))]
  if (!leadIds.length) return new Set()
  const rows = await db.select({ color: members.color }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId)).where(inArray(leadAssignees.leadId, leadIds))
  return new Set(rows.map((r) => photoIdOf(r.color)).filter((x): x is string => !!x))
}

/** What one portal page, opened at `slug` (a preview's mark too), may draw. */
export async function clientFaces(slug: string, visitor: Pick<PortalVisitor, 'links'>): Promise<ClientFaces> {
  return { slug, pictures: await teamPictures(visitor) }
}

/** Whether `pictureId` is the photo of a member on one of the visitor's homes — the face route serves nothing else. */
export async function isClientFace(visitor: Pick<PortalVisitor, 'links'>, pictureId: string): Promise<boolean> {
  return /^[A-Za-z0-9-]{1,64}$/.test(pictureId) && (await teamPictures(visitor)).has(pictureId)
}
