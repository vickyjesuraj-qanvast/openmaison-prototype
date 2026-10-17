import 'server-only'
import { currentPhotoId } from '@/lib/company/member-photo-store'   // (pending modules S01)
import { lookUnder } from '@/lib/company/member-photo'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, settings, studioPictures } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { shortStudioName } from '@/lib/settings/types'
import { SOCIAL_KEYS, SOCIAL_LABEL } from '@/lib/templates/model'
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { isSgPhone, phoneDigits } from '@/lib/format'
import { portalPath } from './model'
import { workOf } from '@/lib/portfolio/queries'   // (pending modules S27)
import { knownFor } from '@/lib/portfolio/model'
import { ABOUT_KEY, EMPTY_ABOUT, aboutHasContent, hasWords, parseAbout, socialHref, webHref, type AboutPage, type StudioAbout, type TeamCard } from './about-model'

/*
 * (gaps build H — H-Q20…H-Q23) The About page's records: the studio's story, year and awards (settings key `studio_about`), its photos
 * (`studio_pictures` kind about, in order — the first is the cover), its facts (Company › Profile, `fetchBrand`) and Our team (members shown
 * on it, active only). Nothing of it reaches a client while the About us switch is off or there is nothing to show (`aboutIsEmpty` keeps the
 * tab off the portal, `portalGate` sends its page home) — the server sends nothing, never the browser hiding it (M-197 · M-211).
 */

export async function readAbout(): Promise<StudioAbout> {
  const [row] = await db.select().from(settings).where(eq(settings.key, ABOUT_KEY)).limit(1)
  if (!row) return EMPTY_ABOUT
  try { return parseAbout(JSON.parse(row.value)) } catch { return EMPTY_ABOUT }
}
export async function saveAbout(a: StudioAbout): Promise<void> {
  const value = JSON.stringify(a)
  const updatedAt = new Date()
  await db.insert(settings).values({ key: ABOUT_KEY, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
}

/** The studio's About photos in their order (no bytes — each opens by its address). */
export async function aboutPhotos(): Promise<{ id: string; caption: string | null; position: number }[]> {
  return db.select({ id: studioPictures.id, caption: studioPictures.caption, position: studioPictures.position }).from(studioPictures)
    .where(and(eq(studioPictures.kind, 'about'), isNull(studioPictures.deletedAt))).orderBy(asc(studioPictures.position), asc(studioPictures.createdAt))
}
/** A picture's address for the studio's own pages; on the portal it rides on the portal's address (checked there). */
export const studioPictureHref = (id: string) => `/company/picture/${id}`
export const portalPictureHref = (slug: string, id: string) => portalPath(slug, `about/picture/${id}`)

/** The members Our team shows — active, shown on the About page — in the Members list's order (role, then name). */
async function shownMembers() {
  const rows = await db.select().from(members).where(and(eq(members.portalShown, true), eq(members.isActive, true)))
  const rank: Record<string, number> = { Owner: 0, Admin: 1, Manager: 2, Designer: 3 }
  return rows.sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.name.localeCompare(b.name))
}

/** Whether the About page has nothing to show — the portal then lists no About tab and its page goes home. */
export async function aboutIsEmpty(): Promise<boolean> {
  const [a, photos, team] = await Promise.all([readAbout(), aboutPhotos(), shownMembers()])
  return !aboutHasContent({ story: a.story, year: a.year, awards: a.awards, photos: photos.length, team: team.length })
}

/** The page as a client reads it. The caller has checked the gate (the section on, the visitor signed in). */
export async function fetchAboutPage(slug: string): Promise<AboutPage | null> {
  const [a, photos, team, brand] = await Promise.all([readAbout(), aboutPhotos(), shownMembers(), fetchBrand()])
  if (!aboutHasContent({ story: a.story, year: a.year, awards: a.awards, photos: photos.length, team: team.length })) return null
  const d = brand.details
  const phone = phoneDigits(d.phone ?? '')
  const wa = phoneDigits(d.socials?.whatsapp ?? '') || (isSgPhone(phone) && /^[89]/.test(phone) ? phone : '')
  /* (pending modules S01) the member's one photo — the same picture as their avatar in the studio; a client's page never carries the studio's
     picture address, so the initial falls back to the look under it */
  /* (pending modules S27) their work, through the portal's own picture address (checked there: a member Our team shows) */
  const work = await workOf(team.map((m) => m.id), (id) => portalPath(slug, `about/work/${id}`))
  const cards: TeamCard[] = team.map((m) => { const photo = currentPhotoId(m); return { id: m.id, name: m.name, title: m.portalTitle?.trim() || m.role, bio: m.portalBio?.trim() || null, photo: photo ? portalPictureHref(slug, photo) : null, color: lookUnder(m.color), years: m.portalYears ?? null, knownFor: knownFor(m.specialty), work: work.get(m.id) ?? [] } })
  return {
    studio: shortStudioName(d.name),
    tagline: d.tagline?.trim() || null,
    year: a.year,
    storyHtml: hasWords(a.story) ? sanitizeContractHtml(a.story) : null,
    photos: photos.map((p) => ({ id: p.id, src: portalPictureHref(slug, p.id), caption: p.caption })),
    awards: a.awards,
    badges: brand.kit.badges ?? [],
    contact: { phone: phone || null, whatsapp: wa || null, email: d.email?.trim() || null, address: d.address?.trim() || null, website: webHref(d.website ?? '') },
    socials: SOCIAL_KEYS.filter((k) => k !== 'website' && k !== 'whatsapp').flatMap((k) => { const href = socialHref(k, d.socials?.[k] ?? ''); return href ? [{ key: k, label: SOCIAL_LABEL[k], href }] : [] }),
    team: cards,
  }
}

/** A studio picture's stored data URL — an About photo, or a member's portrait. `kind` keeps a route to its own kind. */
export async function studioPictureData(id: string, kind?: 'about' | 'member'): Promise<string | null> {
  const [p] = await db.select({ data: studioPictures.data, kind: studioPictures.kind }).from(studioPictures).where(and(eq(studioPictures.id, id), isNull(studioPictures.deletedAt))).limit(1)
  if (!p || (kind && p.kind !== kind)) return null
  return p.data
}
/** Whether a portrait belongs to a member Our team shows now (the portal's route opens nothing else). */
export async function isShownPortrait(id: string): Promise<boolean> {
  const shown = await db.select({ color: members.color, portalPhotoId: members.portalPhotoId }).from(members).where(and(eq(members.portalShown, true), eq(members.isActive, true)))
  return shown.some((m) => currentPhotoId(m) === id)   // (pending modules S01) the member's photo, as the About page shows it
}

/** (H-Q21) Company › Profile's About card: the year, the story, the awards and the photos at the studio's own address. */
export async function fetchAboutSetup(): Promise<{ about: StudioAbout; photos: { id: string; src: string; caption: string | null }[]; now: number }> {
  const [about, photos] = await Promise.all([readAbout(), aboutPhotos()])
  return { about, photos: photos.map((p) => ({ id: p.id, src: studioPictureHref(p.id), caption: p.caption })), now: Date.now() }
}
