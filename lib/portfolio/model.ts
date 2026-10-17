/**
 * (pending modules S27 — Designer portfolio profiles; survey key api:designer-portfolio-profiles; her "build all of them" 2026-10-11) A member's
 * public card, as clients read it: their photo, job title, years in interior design, what they are known for, a line or two about them, and
 * their work — projects with pictures. 1.0 kept it in id_profiles · id_portfolio_projects · id_portfolio_images and showed it only on the
 * Hangout page; its editor (src/components/id-profile/profile-editor.tsx) was never mounted. Here it is one record with one editor (the member's
 * Public profile page, Company › Members) and three readers: the client portal's About › Our team, the studio's Hangout pages, and the meeting
 * room's Past projects. Pure and client-safe. Every word is invented copy unless it is the house's.
 */

export const YEARS_MAX = 60
export const WORK_TITLE_MAX = 80
export const PLACE_MAX = 80
export const WORK_DESC_MAX = 400
export const CAPTION_MAX = 120
/** Pictures per piece of work, and pieces of work per member — what a public card has room for. */
export const PICTURES_MAX = 8
export const WORK_MAX = 12

/** What a member is known for, as chips: their specialty (Company › Members › Preferences — "Condo & executive condo, mid-range residential")
    read as its parts; at most three. One record: the words the lead suggestion matches are the words clients read. */
export function knownFor(specialty: string | null | undefined): string[] {
  return (specialty ?? '').split(/\s*[,;·•|]\s*|\s+\/\s+/).map((s) => s.trim()).filter((s) => s.length > 1).map((s) => s[0]!.toUpperCase() + s.slice(1)).slice(0, 3)
}
/** "12 years in interior design" · "1 year …" · null */
export const yearsLine = (y: number | null | undefined) => (y && y > 0 ? `${y} ${y === 1 ? 'year' : 'years'} in interior design` : null)

export type WorkPicture = { id: string; src: string; caption: string | null }
export type WorkCard = { id: string; title: string; place: string | null; propertyType: string | null; style: string | null; description: string | null; pictures: WorkPicture[]; projectId: string | null }
/** A member's public card, as every reader draws it. `photo` / picture `src` are addresses the reader may open (each reader's own route). */
export type PublicCard = { id: string; name: string; title: string; years: number | null; knownFor: string[]; bio: string | null; photo: string | null; color: string; work: WorkCard[] }

/** "4-room HDB · Japandi" — a piece of work's facts in one line. */
export const workFacts = (w: Pick<WorkCard, 'place' | 'propertyType' | 'style'>) => [w.place, w.propertyType, w.style].filter(Boolean).join(' · ')

export const clip = (v: unknown, max: number): string | null => { const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max); return s || null }
