import 'server-only'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, projects, studioPictures, studioVerificationFiles, studioVerifications } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { fetchStudioStates } from '@/lib/compliance/queries'
import { aboutPhotos, readAbout, studioPictureHref } from '@/lib/portal/about'
import { keptReviewLink } from '@/lib/company/review-link'
import { shortStudioName } from '@/lib/settings/types'
import { notify } from '@/lib/notifications/emit'
import { listingServiceIsStandIn, type ListingAnswer, type ListingPayload } from './service'
import {
  NOTE_MAX, answerNotice, parseSentDocuments, readListing, registrationName,
  type ListingApp, type ListingFacts, type ListingKind, type ListingRead, type ListingStatus, type ListingVia, type ListingView, type ProofFile, type ProofKind, type SentDocuments,
} from './model'

/*
 * (pending modules S37) The studio's listing on Qanvast — its reads, and the one place Qanvast's answer lands (`applyListingAnswer`: the webhook
 * and the prototype's labelled demo play both come here). The words and the rules are lib/qanvast-listing/model.ts; the seam is ./service.ts.
 */

export const listingFileHref = (id: string) => `/company/listing-file/${id}`

/** Every application the studio made, oldest first, with who sent each by name. */
export async function fetchListingApps(): Promise<ListingApp[]> {
  const rows = await db.select().from(studioVerifications).orderBy(asc(studioVerifications.submittedAt))
  const ids = [...new Set(rows.map((r) => r.submittedBy).filter((x): x is string => !!x))]
  const names = new Map((ids.length ? await db.select({ id: members.id, name: members.name }).from(members).where(inArray(members.id, ids)) : []).map((m) => [m.id, m.name]))
  return rows.map((r) => ({
    id: r.id, kind: r.kind as ListingKind, status: r.status as ListingStatus, studioName: r.studioName, uen: r.uen, description: r.description, differentiator: r.differentiator,
    projectsDelivered: r.projectsDelivered, sent: parseSentDocuments(r.submittedDocuments), submittedAt: r.submittedAt.getTime(), submittedBy: r.submittedBy ? names.get(r.submittedBy) ?? null : null,
    reviewedAt: r.reviewedAt?.getTime() ?? null, note: r.adminNotes, via: (r.answeredVia as ListingVia | null) ?? null,
  }))
}
export async function fetchListingRead(): Promise<ListingRead> { return readListing(await fetchListingApps()) }

/** The studio's completed projects (a deleted one is not delivered work on record). */
export async function countDelivered(): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(projects).where(and(eq(projects.stage, 'completed'), isNull(projects.deletedAt)))
  return Number(r?.n ?? 0)
}

/** What the studio's records say today — Company › Profile's details, registrations and About, and its completed projects. */
export async function fetchListingFacts(): Promise<ListingFacts> {
  const [brand, states, delivered, photos, about] = await Promise.all([fetchBrand(), fetchStudioStates(), countDelivered(), aboutPhotos(), readAbout()])
  const d = brand.details
  const story = about.story ?? ''
  return {
    studioName: d.name?.trim() ?? '',
    uen: d.uen?.trim() ?? '',
    registrations: Object.entries(states).filter(([, s]) => s.done).map(([id]) => id),
    projectsDelivered: delivered,
    photos: photos.map((p) => ({ id: p.id, src: studioPictureHref(p.id) })),
    reviewLink: keptReviewLink(d.reviewLink) || null,
    website: d.website?.trim() || null,
    founded: about.year ?? null,
    awards: about.awards.map((a) => (a.year ? `${a.name} · ${a.year}` : a.name)),
    story,
  }
}

/** The studio's proof files as the list shows them (no bytes). */
export async function fetchProofFiles(): Promise<ProofFile[]> {
  const rows = await db.select({ id: studioVerificationFiles.id, kind: studioVerificationFiles.kind, name: studioVerificationFiles.name, mime: studioVerificationFiles.mime, size: studioVerificationFiles.sizeBytes })
    .from(studioVerificationFiles).where(isNull(studioVerificationFiles.removedAt)).orderBy(asc(studioVerificationFiles.addedAt))
  return rows.map((r) => ({ id: r.id, kind: r.kind as ProofKind, name: r.name, mime: r.mime, size: r.size, href: listingFileHref(r.id) }))
}

/** Company › Profile's card, whole. */
export async function fetchListing(): Promise<ListingView> {
  const [read, facts, files] = await Promise.all([fetchListingRead(), fetchListingFacts(), fetchProofFiles()])
  return { read, facts, files, standIn: listingServiceIsStandIn() }
}

/** A proof file's bytes — a sent application keeps its files readable after they leave the list. */
export async function listingFileData(id: string): Promise<{ data: string; name: string } | null> {
  const [f] = await db.select({ data: studioVerificationFiles.data, name: studioVerificationFiles.name }).from(studioVerificationFiles).where(eq(studioVerificationFiles.id, String(id ?? ''))).limit(1)
  return f ?? null
}

/** The snapshot an application keeps of the records it was made from. */
export function sentOf(facts: ListingFacts, files: ProofFile[]): SentDocuments {
  return {
    registrations: facts.registrations, photos: facts.photos.map((p) => p.id), files: files.map((f) => ({ id: f.id, kind: f.kind, name: f.name })),
    reviewLink: facts.reviewLink, website: facts.website, founded: facts.founded, awards: facts.awards,
  }
}

/** What the seam sends for an application (pictures and files read only when the adapter asks). */
export async function payloadOf(app: { id: string; kind: 'apply' | 'update'; description: string; differentiator: string | null }, facts: ListingFacts, files: ProofFile[], senderId: string): Promise<ListingPayload> {
  const [me] = await db.select({ name: members.name, email: members.email, phone: members.phone }).from(members).where(eq(members.id, senderId)).limit(1)
  return {
    applicationId: app.id, kind: app.kind, description: app.description, differentiator: app.differentiator, projectsDelivered: facts.projectsDelivered,
    studio: { name: facts.studioName, uen: facts.uen, website: facts.website, reviewLink: facts.reviewLink, founded: facts.founded, awards: facts.awards },
    registrations: facts.registrations.map((id) => ({ id, name: registrationName(id) })),
    photos: facts.photos.map((p) => ({ id: p.id, read: async () => (await db.select({ data: studioPictures.data }).from(studioPictures).where(eq(studioPictures.id, p.id)).limit(1))[0]?.data ?? null })),
    files: files.map((f) => ({ id: f.id, kind: f.kind, name: f.name, mime: f.mime, size: f.size, read: async () => (await listingFileData(f.id))?.data ?? null })),
    sentBy: { name: me?.name ?? '', email: me?.email ?? null, phone: me?.phone ?? null },
  }
}

const touch = () => { revalidatePath('/company/profile'); revalidatePath('/company/integrations') }
export { touch as touchListing }

export type AnswerResult = { id: string; status: 'answered' | 'already' | 'not_found' | 'not_waiting' }
/**
 * Qanvast's answer to an application — the one place it lands. Only a waiting application takes one (a second call with the same answer is
 * `already`, never a second bell; one withdrawn, closed or answered otherwise is `not_waiting`). Listed (`verified`) or Needs changes
 * (`rejected`, with the note), when, and how it came (`qanvast` · `demo`); the studio's Owners and Admins hear it in the bell (and by email,
 * as Settings › Notifications says).
 */
export async function applyListingAnswer(a: ListingAnswer, via: ListingVia): Promise<AnswerResult> {
  const where = a.applicationId ? eq(studioVerifications.id, a.applicationId) : a.providerRef ? eq(studioVerifications.providerRef, a.providerRef) : null
  if (!where) return { id: '', status: 'not_found' }
  const [row] = await db.select().from(studioVerifications).where(where).limit(1)
  if (!row) return { id: a.applicationId ?? a.providerRef ?? '', status: 'not_found' }
  const status: ListingStatus = a.outcome === 'verified' ? 'verified' : 'rejected'
  if (row.status !== 'pending') return { id: row.id, status: row.status === status ? 'already' : 'not_waiting' }
  const note = (a.note ?? '').trim().slice(0, NOTE_MAX) || null
  const at = new Date(a.at && Number.isFinite(a.at) ? Math.min(a.at, Date.now()) : Date.now())
  /* compare-and-set: only the waiting row moves — two answers racing land once */
  const moved = await db.update(studioVerifications).set({ status, reviewedAt: at, adminNotes: note, answeredVia: via })
    .where(and(eq(studioVerifications.id, row.id), eq(studioVerifications.status, 'pending'))).returning({ id: studioVerifications.id })
  if (!moved.length) return { id: row.id, status: 'already' }
  const brand = await fetchBrand()
  const runners = (await db.select({ id: members.id }).from(members).where(and(eq(members.isActive, true), or(eq(members.role, 'Owner'), eq(members.role, 'Admin'))))).map((m) => m.id)
  const words = answerNotice({ outcome: a.outcome, kind: row.kind as ListingKind, studio: shortStudioName(brand.details.name) || 'your studio', note, via })
  try {
    await notify('listing_answered', runners, { ...words, href: '/company/profile#qanvast', actorId: null, fields: { note: `${words.title}. ${words.body}` } })
  } catch (e) { console.error('[qanvast-listing] the bell failed:', e instanceof Error ? e.message : e) }
  touch()
  return { id: row.id, status: 'answered' }
}

/** For the ghosts (lib/ghost-shapes.server.ts): which shape Company › Profile's card and Integrations' Qanvast chip land in. */
export async function listingShape(): Promise<Record<string, boolean>> {
  const read = await fetchListingRead().catch(() => null)
  return { 'qanvast.listed': read?.state === 'listed', 'qanvast.waiting': !!read?.pending, 'qanvast.asked': !!read?.asked, 'qanvast.outside': read?.listed?.kind === 'outside', 'qanvast.standin': listingServiceIsStandIn() }
}
