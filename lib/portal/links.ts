/**
 * (pending modules S13 — card held:client-portal, "Footer Privacy · Terms · Contact links … revisit: a portal that signs people in by phone
 * needs a privacy notice (PDPA)"; 1.0's `FooterLinksRow`, src/components/homeowner/portal-footer-extras.tsx, set on its Studio Profile card)
 * The links at the foot of every portal page and the sign-in page: the studio's own privacy notice, its terms and its contact page — each a
 * web address the studio keeps on its own site, each shown only once it is set (1.0's rule). Stored in `settings` under `portal_links`,
 * beside the welcome line; written by Company › Client portal (Owners and Admins). Pure and client-safe.
 */
import { cleanLink, shortLink } from '@/lib/quotes/items-model'

export const LINKS_KEY = 'portal_links'

export type FootLinkKey = 'privacy' | 'terms' | 'contact'
export type FootLinks = Record<FootLinkKey, string | null>
export const NO_FOOT_LINKS: FootLinks = { privacy: null, terms: null, contact: null }

/** The three, in the foot's order: the word the client reads (1.0's), and the field's label on Company › Client portal. (invented copy: the
    field labels) */
export const FOOT_LINKS: readonly { key: FootLinkKey; word: string; field: string }[] = [
  { key: 'privacy', word: 'Privacy', field: 'Privacy notice link' },
  { key: 'terms', word: 'Terms', field: 'Terms link' },
  { key: 'contact', word: 'Contact', field: 'Contact page link' },
]

/** Company › Client portal › Privacy and terms — the card's help, said once for the card and its ghost. (invented copy) */
export const LINKS_HELP = 'Clients sign in with their mobile number, so Singapore’s PDPA asks you to tell them how you use their details. Link the pages on your own website — each shows at the foot of every page of the portal, the sign-in page too. An empty box shows nothing.'

/** A field's refusal: a web address only (http or https; a bare "yourstudio.sg/privacy" gets https:// in front, as a quote line's link does). */
export const FOOT_LINK_MSG = 'Enter a web address, e.g. yourstudio.sg/privacy'

/** What a stored or typed value keeps: each link cleaned, anything that is not a web address dropped. */
export function parseFootLinks(v: unknown): FootLinks {
  const r = (v ?? {}) as Partial<Record<string, unknown>>
  const one = (x: unknown) => (typeof x === 'string' ? cleanLink(x) ?? null : null)
  return { privacy: one(r.privacy), terms: one(r.terms), contact: one(r.contact) }
}

/** Why a typed link can't be kept, or null (an empty box keeps none). */
export function footLinkProblem(v: string): string | null {
  return cleanLink(v) === undefined ? FOOT_LINK_MSG : null
}

/** The links a page draws — the set ones, in order. */
export function footLinksShown(l: FootLinks | null | undefined): { key: FootLinkKey; word: string; href: string }[] {
  if (!l) return []
  return FOOT_LINKS.flatMap((d) => (l[d.key] ? [{ key: d.key, word: d.word, href: l[d.key]! }] : []))
}

export const sameFootLinks = (a: FootLinks, b: FootLinks) => FOOT_LINKS.every((d) => (a[d.key] ?? null) === (b[d.key] ?? null))

/** "demostudio.sg/privacy" — a link as a line of words shows it. */
export const footLinkText = (href: string) => shortLink(href)

/** (Getting it live's fifth row) The privacy notice: what the studio sees, set or not. (invented copy) */
export function privacyStepLine(l: FootLinks): string {
  return l.privacy
    ? `Linked at the foot of every page — ${footLinkText(l.privacy)}.`
    : 'Clients sign in with their mobile number, so Singapore’s PDPA asks you to tell them how you use it — link your privacy notice.'
}
