import 'server-only'
import { detailsBlock } from '@/lib/company/member-rules'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hangoutDesigners, hangoutEvents, hangoutParticipations, leadFiles, leadFileImages, leads, memberPortfolioPictures, memberPortfolioProjects, members, projects } from '@/lib/db/schema'
import { currentPhotoId } from '@/lib/company/member-photo-store'
import { lookUnder } from '@/lib/company/member-photo'
import { studioPictureHref } from '@/lib/portal/about'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/settings/roles'
import { midnightOf, eventDays } from '@/lib/hangouts/model'
import { knownFor, type PublicCard, type WorkCard } from './model'

/*
 * (pending modules S27 — api:designer-portfolio-profiles) A member's public card and work, read for each of its readers: the editor (the
 * studio's own picture addresses), the client portal's Our team and a Hangout page (each with its own picture route, checked there).
 */

/** The studio's address for a piece of work's picture (the editor, the meeting room). */
export const workPictureHref = (id: string) => `/company/work/${id}`

/** Each member's work, in their order, with its pictures in theirs — `href` names the reader's own picture route. */
export async function workOf(memberIds: readonly string[], href: (pictureId: string) => string): Promise<Map<string, WorkCard[]>> {
  const out = new Map<string, WorkCard[]>()
  if (!memberIds.length) return out
  const works = await db.select().from(memberPortfolioProjects).where(and(inArray(memberPortfolioProjects.memberId, [...memberIds]), isNull(memberPortfolioProjects.deletedAt)))
    .orderBy(asc(memberPortfolioProjects.position), asc(memberPortfolioProjects.createdAt))
  const pics = works.length ? await db.select({ id: memberPortfolioPictures.id, portfolioId: memberPortfolioPictures.portfolioId, caption: memberPortfolioPictures.caption, position: memberPortfolioPictures.position, createdAt: memberPortfolioPictures.createdAt })
    .from(memberPortfolioPictures).where(and(inArray(memberPortfolioPictures.portfolioId, works.map((w) => w.id)), isNull(memberPortfolioPictures.deletedAt)))
    .orderBy(asc(memberPortfolioPictures.position), asc(memberPortfolioPictures.createdAt)) : []
  for (const w of works) {
    const list = out.get(w.memberId) ?? []
    list.push({ id: w.id, title: w.title, place: w.place, propertyType: w.propertyType, style: w.style, description: w.description, projectId: w.projectId,
      pictures: pics.filter((p) => p.portfolioId === w.id).map((p) => ({ id: p.id, src: href(p.id), caption: p.caption })) })
    out.set(w.memberId, list)
  }
  return out
}

type CardMember = typeof members.$inferSelect
/** Public cards for these members, in the order given — `photo` / `picture` name the reader's own routes. */
export async function publicCards(list: readonly CardMember[], o: { photo: (pictureId: string) => string; picture: (pictureId: string) => string }): Promise<PublicCard[]> {
  const work = await workOf(list.map((m) => m.id), o.picture)
  return list.map((m) => {
    const photo = currentPhotoId(m)
    return { id: m.id, name: m.name, title: m.portalTitle?.trim() || m.role, years: m.portalYears ?? null, knownFor: knownFor(m.specialty), bio: m.portalBio?.trim() || null,
      photo: photo ? o.photo(photo) : null, color: lookUnder(m.color), work: work.get(m.id) ?? [] }
  })
}

/** A piece of work's picture and whose work it is (a live picture on live work only). */
export async function portfolioPicture(id: string): Promise<{ data: string; memberId: string } | null> {
  const [p] = await db.select({ data: memberPortfolioPictures.data, memberId: memberPortfolioProjects.memberId }).from(memberPortfolioPictures)
    .innerJoin(memberPortfolioProjects, eq(memberPortfolioProjects.id, memberPortfolioPictures.portfolioId))
    .where(and(eq(memberPortfolioPictures.id, id), isNull(memberPortfolioPictures.deletedAt), isNull(memberPortfolioProjects.deletedAt))).limit(1)
  return p ?? null
}

export type ProjectPick = { id: string; number: string; name: string; propertyType: string | null; style: string | null; pictures: { fileId: string; name: string; src: string }[] }
export type PublicProfileData = {
  member: { id: string; name: string; role: string; color: string; photoId: string | null; portalShown: boolean; portalTitle: string | null; portalBio: string | null; portalYears: number | null; specialty: string | null; isYou: boolean; isActive: boolean }
  card: PublicCard
  /** the studio's projects whose pictures the viewer may pick (Who sees leads) */
  projects: ProjectPick[]
  /** where clients read this card now */
  shownOn: { about: boolean; hangouts: { id: string; name: string; on: number }[] }
  mayEdit: boolean
  /** Owners and Admins: who is on the About page is the studio's call */
  mayShow: boolean
  /** the photo is the member's avatar too — it follows the details' rule (an Owner's only an Owner changes, S01) */
  photoLocked: string | null
  viewerId: string
}

/** The Public profile page: the member's card as clients read it, their work at the studio's own addresses, and what the viewer may change —
    their own card, or (Owners and Admins) anyone's. Null when the member is not one of the studio's. */
export async function fetchPublicProfile(memberId: string, now = Date.now()): Promise<PublicProfileData | null> {
  const [m] = await db.select().from(members).where(eq(members.id, memberId)).limit(1)
  if (!m) return null
  const viewer = await fetchViewer()
  const [card] = await publicCards([m], { photo: studioPictureHref, picture: workPictureHref })
  const visible = await visibleLeadIds(viewer)
  const projRows = await db.select({ id: projects.id, number: projects.number, leadId: projects.leadId, name: leads.name, propertyType: leads.propertyType, style: leads.style })
    .from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(isNull(projects.deletedAt))
  const mine = projRows.filter((p) => visible === null || visible.has(p.leadId))
  const files = mine.length ? await db.select({ id: leadFiles.id, leadId: leadFiles.leadId, name: leadFiles.name }).from(leadFiles)
    .innerJoin(leadFileImages, eq(leadFileImages.fileId, leadFiles.id))
    .where(and(inArray(leadFiles.leadId, mine.map((p) => p.leadId)), isNull(leadFiles.deletedAt), eq(leadFiles.kind, 'image'))) : []
  const picks: ProjectPick[] = mine.map((p) => ({ id: p.id, number: p.number, name: p.name, propertyType: p.propertyType, style: p.style,
    pictures: files.filter((f) => f.leadId === p.leadId).map((f) => ({ fileId: f.id, name: f.name, src: `/files/img/${f.id}` })) }))
    .sort((a, b) => b.number.localeCompare(a.number))
  /* the studio's Hangout pages that show them: they are on the plan of one taking part, not yet over */
  const today = midnightOf(now)
  const on = await db.select({ id: hangoutEvents.id, name: hangoutEvents.name, startsOn: hangoutEvents.startsOn, dayCount: hangoutEvents.dayCount }).from(hangoutDesigners)
    .innerJoin(hangoutEvents, eq(hangoutEvents.id, hangoutDesigners.eventId)).innerJoin(hangoutParticipations, eq(hangoutParticipations.eventId, hangoutEvents.id))
    .where(and(eq(hangoutDesigners.memberId, memberId), eq(hangoutParticipations.status, 'confirmed')))
  const hangouts = on.map((e) => ({ id: e.id, name: e.name, on: e.startsOn.getTime(), last: eventDays({ startsOn: e.startsOn.getTime(), dayCount: e.dayCount }).at(-1)! }))
    .filter((e) => e.last >= today).sort((a, b) => a.on - b.on).map(({ id, name, on: at }) => ({ id, name, on: at }))
  const self = viewer.id === m.id
  return {
    member: { id: m.id, name: m.name, role: m.role, color: m.color, photoId: currentPhotoId(m), portalShown: m.portalShown, portalTitle: m.portalTitle, portalBio: m.portalBio, portalYears: m.portalYears ?? null, specialty: m.specialty, isYou: self, isActive: m.isActive },
    card: card!, projects: picks, shownOn: { about: m.portalShown && m.isActive, hangouts },
    mayEdit: (self || runsStudio(viewer.role)) && m.isActive, mayShow: runsStudio(viewer.role) && m.isActive, photoLocked: detailsBlock(viewer, m), viewerId: viewer.id,
  }
}
