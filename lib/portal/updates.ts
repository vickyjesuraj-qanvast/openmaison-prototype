import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leads, members, projectMilestones, projectUpdateFiles, projectUpdates, projects } from '@/lib/db/schema'
import { mediaKindOf, type UpdateMedia } from '@/lib/projects/updates-model'
import { portalFileHref } from './files'
import { placeOf } from './queries'
import { fetchPortalMoney } from '@/lib/projects/payments-portal'
import type { PortalVisitor } from './session'

/*
 * (Projects round 4b, board 3) The portal's Updates on the server: a project's PUBLISHED updates (round 3's rule — `status = 'published'
 * AND deleted_at IS NULL`; a draft, one in review, sent back or withdrawn never leaves here), newest first, each with who wrote it (their
 * first name), the stage it belongs to and its pictures, videos and documents at the portal's own session-checked file address
 * (lib/portal/files.ts — a studio route never reaches the client). No reviewer, no state, no note of the team's.
 */

/** One update as the client reads it. Times are ms. */
export type PortalUpdate = {
  id: string
  projectId: string
  leadId: string
  title: string
  html: string
  /** When it reached the client — its publish. */
  at: number
  author: string | null
  milestone: { id: string; title: string } | null
  media: UpdateMedia[]
  /** The client opened it since it was published (round 3's Withdraw rule reads the same stamp) — (fix-C, C-22) and since its last edit. */
  opened: boolean
  /** (fix-C, C-22) Opened before, its words changed since — the card wears the portal's Changed chip until they open it again. */
  changed: boolean
  /** (gaps build D, item 10 — 1.0 I-260) the invoice of the stage this update is about (its milestone's payment, once sent) — Money's words */
  invoice?: { id: string; number: string; name: string; amountMinor: number; state: 'paid' | 'due' | 'to_confirm' | 'planned' } | null
}

/** An update was opened for this publish: `client_opened_at` at or after its publish (a withdrawn-then-republished one is new again). */
export const openedSince = (openedAt: Date | null, publishedAt: Date | null, editedAt: Date | null = null) =>
  !!openedAt && (!publishedAt || openedAt.getTime() >= publishedAt.getTime()) && (!editedAt || openedAt.getTime() >= editedAt.getTime())   // (fix-C, C-22) an edit is new to them again

const PUBLISHED = (ids: string[]) => and(inArray(projectUpdates.projectId, ids), eq(projectUpdates.status, 'published'), isNull(projectUpdates.deletedAt))

/** The published updates of these projects, newest first, with their media at the portal's address (`slug` '' = a studio-side count). */
async function publishedOf(ps: { id: string; leadId: string }[], slug: string): Promise<PortalUpdate[]> {
  if (!ps.length) return []
  const ids = ps.map((p) => p.id)
  const rows = await db.select().from(projectUpdates).where(PUBLISHED(ids)).orderBy(desc(projectUpdates.publishedAt), desc(projectUpdates.createdAt))
  if (!rows.length) return []
  const uids = rows.map((u) => u.id)
  const msIds = [...new Set(rows.map((u) => u.milestoneId).filter((x): x is string => !!x))]
  const [files, names, ms] = await Promise.all([
    db.select({ updateId: projectUpdateFiles.updateId, f: leadFiles }).from(projectUpdateFiles).innerJoin(leadFiles, eq(leadFiles.id, projectUpdateFiles.fileId))
      .where(and(inArray(projectUpdateFiles.updateId, uids), isNull(leadFiles.deletedAt))).orderBy(asc(projectUpdateFiles.position), asc(projectUpdateFiles.createdAt)),
    db.select({ id: members.id, name: members.name }).from(members),
    msIds.length ? db.select({ id: projectMilestones.id, title: projectMilestones.title, deletedAt: projectMilestones.deletedAt }).from(projectMilestones).where(inArray(projectMilestones.id, msIds)) : Promise.resolve([] as { id: string; title: string; deletedAt: Date | null }[]),
  ])
  const nameOf = new Map(names.map((m) => [m.id, m.name]))
  const href = (fileId: string) => (slug ? portalFileHref(slug, fileId) : null)
  return rows.map((u) => {
    const media: UpdateMedia[] = files.filter((x) => x.updateId === u.id).map(({ f }) => {
      const kind = f.kind === 'video' ? 'video' : f.kind === 'pdf' || f.kind === 'doc' ? 'doc' : mediaKindOf(f.name, f.mime) ?? 'photo'
      /* a picture and a document by the portal's address; a video plays from it too, its poster the frame the upload kept (a data URL) */
      const poster = f.thumb?.startsWith('data:image/') ? f.thumb : null
      return { fileId: f.id, name: f.name, kind, thumb: kind === 'photo' ? href(f.id) : kind === 'video' ? poster : null, src: kind === 'photo' ? null : href(f.id), mime: f.mime, sizeBytes: f.sizeBytes }
    })
    const m = u.milestoneId ? ms.find((x) => x.id === u.milestoneId && !x.deletedAt) ?? null : null
    return {
      id: u.id, projectId: u.projectId, leadId: ps.find((p) => p.id === u.projectId)!.leadId, title: u.title, html: u.body ?? '',
      at: (u.publishedAt ?? u.createdAt).getTime(), author: u.authorId ? nameOf.get(u.authorId) ?? null : null,
      milestone: m ? { id: m.id, title: m.title } : null, media, opened: openedSince(u.clientOpenedAt, u.publishedAt, u.editedAt),
      changed: openedSince(u.clientOpenedAt, u.publishedAt) && !openedSince(u.clientOpenedAt, u.publishedAt, u.editedAt),
    }
  })
}

/* ── What the home and the access panel read (lib/portal/needs.ts `HomeFacts.updates`) ─────────────────────────────────────────── */

export type HomeUpdates = { published: number; inReview: number; latest: PortalUpdate | null }

export async function loadUpdateFacts(leadIds: string[], slug: string): Promise<Map<string, HomeUpdates>> {
  const out = new Map<string, HomeUpdates>()
  if (!leadIds.length) return out
  const ps = await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))
  if (!ps.length) return out
  const [list, waiting] = await Promise.all([
    publishedOf(ps, slug),
    db.select({ projectId: projectUpdates.projectId, n: sql<number>`count(*)` }).from(projectUpdates)
      .where(and(inArray(projectUpdates.projectId, ps.map((p) => p.id)), eq(projectUpdates.status, 'in_review'), isNull(projectUpdates.deletedAt))).groupBy(projectUpdates.projectId),
  ])
  for (const p of ps) {
    const mine = list.filter((u) => u.projectId === p.id)
    out.set(p.leadId, { published: mine.length, inReview: Number(waiting.find((w) => w.projectId === p.id)?.n ?? 0), latest: mine[0] ?? null })
  }
  return out
}

/* ── The Updates tab ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PortalUpdatesHome = { homeId: string; leadId: string; title: string; project: boolean; updates: PortalUpdate[] }

/** Each of the visitor's homes with its published updates, newest first. (gaps build D, item 10) `money`: the Money section is on for this
    visitor — an update tied to an invoiced stage carries its invoice. */
export async function fetchPortalUpdates(visitor: PortalVisitor, slug: string, o: { money?: boolean } = {}): Promise<PortalUpdatesHome[]> {
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!leadIds.length) return []
  const [leadRows, ps] = await Promise.all([
    db.select({ id: leads.id, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress }).from(leads).where(inArray(leads.id, leadIds)),
    db.select({ id: projects.id, leadId: projects.leadId, name: projects.name }).from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt))),
  ])
  const list0 = await publishedOf(ps, slug)
  /* (gaps build D, item 10) the invoice of each update's stage: the stage the milestone's payment is tied to, once its invoice is sent */
  const tied = o.money && list0.some((u) => u.milestone) ? await db.select({ id: projectMilestones.id, paymentRef: projectMilestones.paymentRef }).from(projectMilestones).where(inArray(projectMilestones.id, [...new Set(list0.map((u) => u.milestone?.id).filter((x): x is string => !!x))])) : []
  const money = tied.some((t) => t.paymentRef) ? await fetchPortalMoney(visitor.links.map((l) => ({ linkId: l.linkId, leadId: l.leadId })), Date.now(), visitor.homeownerId) : []
  const list = list0.map((u) => {
    const ref = u.milestone ? tied.find((t) => t.id === u.milestone!.id)?.paymentRef ?? null : null
    const st = ref ? money.find((m) => m.projectId === u.projectId)?.stages.find((s) => s.key === ref && s.invoiceId) ?? null : null
    return st ? { ...u, invoice: { id: st.invoiceId!, number: st.number ?? '', name: st.name, amountMinor: st.amountMinor, state: st.state } } : u
  })
  return visitor.links.map((link) => {
    const l = leadRows.find((x) => x.id === link.leadId)
    const p = ps.find((x) => x.leadId === link.leadId)
    const place = placeOf(l?.propertyAddress ?? l?.leadAddress)
    return { homeId: link.linkId, leadId: link.leadId, title: place ? `Your home at ${place}` : p?.name ?? l?.propertyType ?? 'Your home', project: !!p, updates: p ? list.filter((u) => u.projectId === p.id) : [] }
  })
}

/** The published updates a request names that this visitor may open — the opened stamp's check (another client's id answers nothing). */
export async function updatesForVisitor(visitor: PortalVisitor, ids: string[]) {
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!ids.length || !leadIds.length) return []
  return db.select({ u: projectUpdates, leadId: projects.leadId }).from(projectUpdates).innerJoin(projects, eq(projects.id, projectUpdates.projectId))
    .where(and(inArray(projectUpdates.id, ids.slice(0, 50)), inArray(projects.leadId, leadIds), isNull(projects.deletedAt), eq(projectUpdates.status, 'published'), isNull(projectUpdates.deletedAt)))
}
