/**
 * (gaps build H — calls H-Q20…H-Q23; Q-47's "About / Team later, from Company › Profile and Members" is now) The portal's About page — pure
 * and client-safe. The studio's story, its year, its awards and up to six photos (Company › Profile › About the studio, for clients), its
 * facts (Company › Profile's details and socials — entered once, M-156) and Our team (Company › Members, each member shown or not — 1.0 typed
 * these people by hand, M-195). The server half is lib/portal/about.ts.
 */
import type { WorkCard } from '@/lib/portfolio/model'
export const ABOUT_KEY = 'studio_about'
export type Award = { id: string; name: string; year: number | null }
export type StudioAbout = { year: number | null; story: string; awards: Award[] }
export const EMPTY_ABOUT: StudioAbout = { year: null, story: '', awards: [] }
/** The story's characters (its HTML), the awards, the photos — and a member's two lines and job title. */
export const STORY_MAX = 8000
export const AWARDS_MAX = 12
export const AWARD_MAX = 80
export const ABOUT_PHOTOS_MAX = 6
export const BIO_MAX = 160
export const TITLE_MAX = 40
/** A photo as the browser shrank it (1600 px), in characters of its data URL. */
export const ABOUT_PHOTO_DATA_MAX = 2_400_000

const yearOk = (y: unknown): number | null => (typeof y === 'number' && Number.isInteger(y) && y >= 1900 && y <= 2100 ? y : null)
export function parseAbout(v: unknown): StudioAbout {
  const r = (v ?? {}) as { year?: unknown; story?: unknown; awards?: unknown }
  const awards = Array.isArray(r.awards) ? r.awards.flatMap((a): Award[] => {
    const x = (a ?? {}) as { id?: unknown; name?: unknown; year?: unknown }
    const name = typeof x.name === 'string' ? x.name.replace(/\s+/g, ' ').trim().slice(0, AWARD_MAX) : ''
    return name ? [{ id: typeof x.id === 'string' && x.id ? x.id : name, name, year: yearOk(x.year) }] : []
  }).slice(0, AWARDS_MAX) : []
  return { year: yearOk(r.year), story: typeof r.story === 'string' ? r.story.slice(0, STORY_MAX) : '', awards }
}
/** Why a year can't be kept, or null — four digits, not in the future. */
export function yearProblem(raw: string, now: number): string | null {
  if (!raw.trim()) return null
  const y = Number(raw)
  if (!/^\d{4}$/.test(raw.trim()) || y < 1900) return 'Type the year as four digits — 2012'
  if (y > new Date(now).getFullYear()) return 'That year hasn’t come yet'
  return null
}

/** A text with real words in it (the story is HTML) — "<p><br></p>" is nothing. */
export const hasWords = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim().length > 0

/** One member as Our team shows them. */
/** (pending modules S27 — api:designer-portfolio-profiles) with their years, what they are known for and their work — the member's one public card */
export type TeamCard = { id: string; name: string; title: string; bio: string | null; photo: string | null; color: string; years: number | null; knownFor: string[]; work: WorkCard[] }
/** What the portal's About page draws — built on the server only while the section is on and something is there (H-Q23). */
export type AboutPage = {
  studio: string
  tagline: string | null
  year: number | null
  storyHtml: string | null
  photos: { id: string; src: string; caption: string | null }[]
  awards: Award[]
  /** The brand kit's badges, printed beside the awards. */
  badges: string[]
  contact: { phone: string | null; whatsapp: string | null; email: string | null; address: string | null; website: string | null }
  socials: { key: string; label: string; href: string }[]
  team: TeamCard[]
}
/** The About tab shows only when one of these is there — the contact facts alone don't make a page (they are on every studio). */
export const aboutHasContent = (o: { story: string; year: number | null; awards: readonly unknown[]; photos: number; team: number }) =>
  hasWords(o.story) || o.year !== null || o.awards.length > 0 || o.photos > 0 || o.team > 0

/** "Est. 2012" — and how many years that is. */
export const establishedLine = (year: number, now: number) => {
  const n = new Date(now).getFullYear() - year
  return n >= 2 ? `Est. ${year} · ${n} years of homes` : `Est. ${year}`
}
/** A link as typed, made into one a browser opens (M-154: 1.0 used it as typed). */
export function webHref(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`
  return null
}
/** A social handle or link → its address: "@demostudio" on Instagram → instagram.com/demostudio. */
export function socialHref(key: string, raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  const web = webHref(v)
  if (web) return web
  const handle = v.replace(/^@/, '')
  if (!/^[\w.]+$/.test(handle)) return null
  const base: Record<string, string> = { instagram: 'https://instagram.com/', facebook: 'https://facebook.com/', tiktok: 'https://tiktok.com/@', linkedin: 'https://linkedin.com/company/' }
  return base[key] ? `${base[key]}${handle}` : null
}
