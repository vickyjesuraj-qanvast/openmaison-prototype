import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, leadFileRenders, leadFiles, leads, members, projects, renderConsultationRequests, renderShareLinks, spaceLayoutShares, spaceLayouts } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { titleCaseName } from '@/lib/format'
import { leadDesignId, readShareLink } from '@/lib/visualizer/queries'
import { readPlan } from '@/lib/planner/queries'
import { allRooms } from '@/lib/planner/model'
import { worksOn } from '@/lib/projects/policy'
import { accessState } from '@/lib/portal/model'
import { fetchPortalLook, fetchPortalSettings, stampsOf } from '@/lib/portal/queries'

/*
 * (simplify S-03 — Design › Designs, the owner's "build everything" 2026-10-09) A project's Designs view: what the client sees of the studio's
 * designs, read from the records the portal's Designs reads (lib/portal/designs.ts · `fetchPortalLayouts`), seen from the studio's side —
 * every renders link that has not ENDED (the studio's Stop, the design in the trash, the lead closed, every version on it deleted end it:
 * `readShareLink`'s `ended`; past its 7 days it stays on the client's page, M-06), with who shared it, the client's favourite and whether the
 * client opened it; every 3D layout of the project, shared or not, with its share's state (opened, changes not shared yet); and the renders
 * filed in Files (the Overview's old Key documents' "Latest renders"). No new record: a view on existing ones. Who reads it: whoever sees the
 * project (its lead's rule).
 */

export type DesignVersion = { key: string; room: string; label: string; imageUrl: string; favourite: boolean }
export type DesignShare = {
  id: string; designId: string; sharedAt: number; expiresAt: number
  /** the no-login link still opens — past its 7 days the designs stay on the client's page (M-06), the link to mark them has closed */
  open: boolean
  /** who shared it — their first name */ sender: string | null
  message: string | null
  rooms: number
  versions: DesignVersion[]
  /** how often the client opened the link, and when last */ views: number; lastViewedAt: number | null
}
export type DesignLayout = {
  id: string; name: string; rooms: number; updatedAt: number
  /** its live share (not stopped), or null while it is the studio's alone */
  share: { sharedAt: number; sender: string | null; firstViewedAt: number | null; lastViewedAt: number | null; views: number
    /** the layout moved on since it was shared — the client still sees the shared one */ changes: boolean } | null
}
export type SavedRender = { id: string; name: string; thumb: string | null }
/** (simplify round 2) Why the client sees none of this on their page, worst first — Company › Client portal switched Designs off for every
    client · they hold no access (never invited, or withdrawn) · the portal is paused — or null while they can open it. */
export type DesignsReach = { why: 'off' | 'none' | 'withdrawn' | 'paused'; /** the viewer may invite them (the Invite to Portal panel's rule) */ mayInvite: boolean } | null
export type ProjectDesignsData = {
  project: { id: string; name: string; leadId: string; client: string }
  /** the project's lead's AI Visualizer design, when there is one */
  designId: string | null
  shares: DesignShare[]
  layouts: DesignLayout[]
  saved: SavedRender[]
  /** (simplify round 2) whether the client can see Designs on their page — the line the view says when they can't */
  reach: DesignsReach
  now: number
}

const firstOf = (name: string | null | undefined) => (name ? name.trim().split(/\s+/)[0] ?? name : null)

export async function fetchProjectDesigns(projectId: string): Promise<ProjectDesignsData | null> {
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return null
  const { p, l } = row
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, l.id))) return null
  const [designId, shares, layouts, saved, team, [link], look, portal, assigned] = await Promise.all([
    leadDesignId(l.id),
    db.select().from(renderShareLinks).where(and(eq(renderShareLinks.leadId, l.id), isNull(renderShareLinks.revokedAt))).orderBy(desc(renderShareLinks.createdAt)),
    db.select().from(spaceLayouts).where(and(eq(spaceLayouts.projectId, p.id), isNull(spaceLayouts.deletedAt))).orderBy(desc(spaceLayouts.updatedAt)),
    db.select({ id: leadFiles.id, name: leadFiles.name, thumb: leadFiles.thumb }).from(leadFileRenders).innerJoin(leadFiles, eq(leadFiles.id, leadFileRenders.fileId))
      .where(and(eq(leadFiles.leadId, l.id), isNull(leadFiles.deletedAt))).orderBy(desc(leadFiles.createdAt)),
    db.select({ id: members.id, name: members.name }).from(members),
    /* (simplify round 2) what the client can open: their access, the studio's Designs switch, the portal live or paused */
    db.select({ invitedAt: homeownerLeadLinks.invitedAt, openedAt: homeownerLeadLinks.openedAt, lastOpenedAt: homeownerLeadLinks.lastOpenedAt, withdrawnAt: homeownerLeadLinks.withdrawnAt })
      .from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, l.id)).limit(1),
    fetchPortalLook(),
    fetchPortalSettings(),
    db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.id)),
  ])
  const access = accessState(link ? stampsOf(link) : null)
  const why = look.hidden.includes('designs') ? 'off' : access === 'none' || access === 'withdrawn' ? access : portal.paused ? 'paused' : null
  const nameOf = (id: string | null | undefined) => firstOf(team.find((m) => m.id === id)?.name)

  /* the renders: the links the client still has (the portal's rule), each read as the client's page reads it */
  const reads = (await Promise.all(shares.map(async (s) => ({ s, r: await readShareLink(s.token) })))).filter((x) => !!x.r && !x.r.ended && x.r.live.length)
  const linkIds = reads.map((x) => x.s.id)
  const favs = linkIds.length ? await db.select({ link: renderConsultationRequests.shareLinkId, key: renderConsultationRequests.versionKey, at: renderConsultationRequests.createdAt }).from(renderConsultationRequests)
    .where(and(inArray(renderConsultationRequests.shareLinkId, linkIds), eq(renderConsultationRequests.kind, 'favourite'))) : []

  /* the layouts: the project's own, each with its live share (one per layout — the newest, as the planner keeps it) */
  const layoutShares = layouts.length ? await db.select().from(spaceLayoutShares).where(and(inArray(spaceLayoutShares.layoutId, layouts.map((x) => x.id)), isNull(spaceLayoutShares.revokedAt))).orderBy(desc(spaceLayoutShares.updatedAt)) : []

  return {
    project: { id: p.id, name: p.name, leadId: l.id, client: firstOf(titleCaseName(l.name)) ?? titleCaseName(l.name) },
    designId,
    shares: reads.map(({ s, r }) => {
      const fav = favs.filter((f) => f.link === s.id).sort((a, b) => b.at.getTime() - a.at.getTime())[0]?.key ?? null
      return {
        id: s.id, designId: s.designId, sharedAt: s.createdAt.getTime(), expiresAt: s.expiresAt.getTime(), open: r!.state === 'open', sender: nameOf(s.createdBy), message: s.message,
        rooms: new Set(r!.live.map((v) => v.roomId)).size,
        versions: r!.live.map((v) => ({ key: v.key, room: v.clientRoom, label: v.clientLabel, imageUrl: v.imageUrl, favourite: v.key === fav })),
        views: s.viewCount, lastViewedAt: s.lastViewedAt?.getTime() ?? null,
      }
    }),
    layouts: layouts.map((x) => {
      const s = layoutShares.find((y) => y.layoutId === x.id) ?? null
      return {
        id: x.id, name: x.name, rooms: allRooms(readPlan(x.plan)).length,   /* (parity map, TD-075) every level's rooms */ updatedAt: x.updatedAt.getTime(),
        share: s ? { sharedAt: s.sharedAt.getTime(), sender: nameOf(s.sharedBy), firstViewedAt: s.firstViewedAt?.getTime() ?? null, lastViewedAt: s.lastViewedAt?.getTime() ?? null, views: s.viewCount, changes: x.rev > s.sharedRev } : null,
      }
    }),
    saved,
    reach: why ? { why, mayInvite: worksOn(viewer, assigned.map((a) => a.id)) } : null,
    now: Date.now(),
  }
}
