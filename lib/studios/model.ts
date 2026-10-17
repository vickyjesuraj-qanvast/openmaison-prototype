import { EMAIL_RE, MSG, type FieldErrors } from '@/lib/forms'
import { isSgMobile, isSgPhone, phoneDigits, titleCaseName } from '@/lib/format'
import { DEFAULT_BRAND, EMPTY_ENTITY } from '@/lib/templates/model'
import type { BrandSetting } from '@/lib/templates/brand'
import { SIGN_IN } from '@/lib/auth/model'

/*
 * (pending modules S31 — her "build all of them" 2026-10-11; card onboarding:studio-sign-up; 1.0's src/app/onboarding/page.tsx (the tour that
 * saved nothing), src/app/api/admin/studios/route.ts POST (Platform admin › Studios › Add Studio), src/lib/studio-default-taxonomies.ts, the
 * Qanvast line's auto-provision in api/auth/verify) A NEW STUDIO JOINS — what it is and the words it says, pure and client-safe.
 *
 * The card's two questions, taken as recommended (her "build all of them"): (1) **self-serve** — a studio signs itself up from the sign-in
 * page and starts on Free (2.0 already sells the plans inside the app, S19); OpenMaison's staff making studios is Platform admin, excluded by
 * her. (2) **A freelancer is a studio of one** — not a kind of its own: "I work on my own" makes the same studio, named for their business,
 * whose Set up your studio never asks for a team. "I work in a studio" makes nothing: the studio's Owner adds them (S09's invitation).
 *
 * What a new studio starts with (1.0's admin route + `seedDefaultStudioTaxonomies`, in 2.0's shape — the house defaults every studio reads
 * until it changes them, so nothing needs writing): 2.0's lead sources (1.0's eleven and the five REG-607 added), its eight ticket categories
 * (1.0's eight escalation categories in plain words), the seven lead stages and their rules, the four roles; 2.0's three project types stay the
 * Projects build's fixed list. What it is given: its name, the Owner (owed the first-visit welcome — S08), an EMPTY brand kit and details (S08:
 * the demo's details are the parser's fallback, so an absent row would read as set up), Free with 1.0's 150 welcome AI credits and 30 a month
 * (S19), the copies of OpenMaison's feeds every studio reads (the Marketplace, Market Insights, Qanvast's Hangouts), and the record of its
 * making (`studio_origin`). No fonts (S11), no templates, no Price book, no members but its Owner, no invitation for the Owner (S09).
 */

/** How the person works — the sign-up's first question (1.0's "Choose your role": Studio Owner · In-Studio ID · Freelancer). */
export type SignUpKind = 'studio' | 'member' | 'solo'
export const SIGN_UP_KINDS: { key: SignUpKind; title: string; help: string }[] = [
  { key: 'studio', title: 'I run a studio', help: 'Set up your studio, then invite your team.' },
  { key: 'member', title: 'I work in a studio', help: 'Your studio’s Owner adds you — there’s nothing to set up.' },
  { key: 'solo', title: 'I work on my own', help: 'A studio of one — the same tools, no team to set up.' },
]
export const isSignUpKind = (v: unknown): v is SignUpKind => v === 'studio' || v === 'member' || v === 'solo'

/** The record of a studio's making — settings key `studio_origin`, written once when it is made. The demo has none (it is the demo). */
export const ORIGIN_KEY = 'studio_origin'
export type StudioOrigin = {
  madeAt: number
  /** the member who made it — its first Owner */
  ownerId: string
  /** a studio, or a studio of one (`solo` — Set up your studio asks for no team) */
  kind: 'studio' | 'solo'
  /** how it was made: signing up, or a first sign-in through Qanvast (1.0's auto-provision; the developers' provider) */
  via: 'sign-up' | 'qanvast'
}
export function parseOrigin(v: unknown): StudioOrigin | null {
  const r = (v ?? null) as Partial<Record<keyof StudioOrigin, unknown>> | null
  if (!r || typeof r.ownerId !== 'string' || typeof r.madeAt !== 'number') return null
  return { madeAt: r.madeAt, ownerId: r.ownerId, kind: r.kind === 'solo' ? 'solo' : 'studio', via: r.via === 'qanvast' ? 'qanvast' : 'sign-up' }
}

export const NAME_MAX = 80
export const PERSON_MAX = 60

/** The sign-up's details, as typed. */
export type SignUpInput = { kind: SignUpKind; studioName: string; ownerName: string; phone: string; email: string }
/** …and as kept: the names tidied, the mobile's 8 digits, the email lower-cased (or none). */
export type NewStudio = { kind: 'studio' | 'solo'; studioName: string; ownerName: string; phone: string; email: string | null }
export type SignUpField = 'studioName' | 'ownerName' | 'phone' | 'email'

/** The details, checked — each field's refusal in the house words, or the studio to make. */
export function readSignUp(input: Partial<SignUpInput> | null | undefined): { studio: NewStudio } | { errors: FieldErrors<SignUpField> } {
  const kind = input?.kind === 'solo' ? 'solo' : 'studio'
  const studioName = String(input?.studioName ?? '').replace(/\s+/g, ' ').trim()
  const ownerName = titleCaseName(String(input?.ownerName ?? ''))
  const digits = phoneDigits(String(input?.phone ?? ''))
  const email = String(input?.email ?? '').trim().toLowerCase()
  const errors: FieldErrors<SignUpField> = {}
  if (!studioName) errors.studioName = kind === 'solo' ? SIGN_UP.businessNeeded : SIGN_UP.studioNeeded
  else if (studioName.length > NAME_MAX) errors.studioName = SIGN_UP.nameLong
  if (!ownerName) errors.ownerName = SIGN_UP.ownerNeeded
  else if (ownerName.length > PERSON_MAX) errors.ownerName = SIGN_UP.personLong
  if (!digits) errors.phone = SIGN_UP.phoneNeeded
  else if (!isSgMobile(digits)) errors.phone = isSgPhone(digits) ? SIGN_IN.landline : MSG.phone
  if (email && (email.length > 120 || !EMAIL_RE.test(email))) errors.email = MSG.email
  if (Object.keys(errors).length) return { errors }
  return { studio: { kind, studioName, ownerName, phone: digits, email: email || null } }
}

/** A studio's key on this prototype — its database file's name: the name made into an address, then eight hex characters. */
export const studioSlug = (name: string) => name.toLowerCase().replace(/\b(pte\.?\s*ltd\.?|private limited|llp|ltd\.?)\b/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'studio'
export const isStudioKey = (k: unknown): k is string => typeof k === 'string' && /^[a-z0-9-]{1,40}-[a-f0-9]{8}$/.test(k)
/** (S30 → S31) Sign-in hands the number or email it found no account for to sign-up, in this tab only (sessionStorage) — so nobody types it
    twice. */
export const HANDOFF_KEY = 'om.signup.contact'
/** The demo studio's key in the menu and the actions (a made studio's key always ends in its eight hex characters, so never this). */
export const DEMO_KEY = 'demo'
/** How many studios this prototype keeps beside the demo — Reset prototype to base clears them. */
export const MAX_PROTOTYPE_STUDIOS = 20

/** S08's rule for a new studio: the brand kit and the details start EMPTY — no logo (the parser's fallback is the demo's mark), no details,
    no bank — so Set up your studio reads every step open; the studio's own entity carries its name. */
export function emptyBrandSetting(name: string): BrandSetting {
  return {
    kit: { logo: null, logoDark: null, stamp: null, badges: [], colors: { ...DEFAULT_BRAND.colors }, fonts: { ...DEFAULT_BRAND.fonts } },
    details: { name, address: '', phone: '', fax: '', email: '', website: '', uen: '', gstReg: '', licence: '', tagline: '', social: '', socials: {}, entities: [EMPTY_ENTITY(name)] },
  }
}

/** The studio block — the rail's corner and the phone's You sheet: the studio this prototype has open, who it is in its base state, and the
    studios started here (the menu's Studios group, only when there are some). */
export type StudioChrome = {
  /** "Demo Studio" — the studio's name as a sentence says it */
  name: string
  /** the block's second line while nobody is being viewed as: the demo's mock words, a new studio's Owner */
  owner: string
  /** the member who is the studio in its base state — anyone else signed in or viewed as reads "Viewing as …" */
  baseId: string
  /** the block's picture: the demo's avatar, a new studio's logo, else null (its initial) */
  mark: string | null
  /** a studio of one ("I work on my own") — Set up your studio and its ghost ask for no team */
  solo: boolean
  /** the studios on this prototype — the demo first — with the open one marked; empty while no studio was started here */
  studios: { key: string; name: string; line: string; open: boolean }[]
}
/** The demo's block as the mock draws it (REG-667). */
export const DEMO_CHROME: StudioChrome = { name: 'Demo Studio', owner: 'Dane Bruce Lee', baseId: 'dane', mark: '/figma-assets/avatar-studio.svg', solo: false, studios: [] }

/** Why signing up can't start here, as the first step's notice says it — sign-ups paused for the platform, or a server with no room for a
    studio of its own; null when it can. */
export const signUpBlock = (o: { paused: boolean; canStart: boolean }): string | null =>
  o.paused ? `${SIGN_UP.pausedTitle}. ${SIGN_UP.paused}.` : !o.canStart ? `${SIGN_UP.noHome}.` : null

/** The words (invented copy — REG-S31; 1.0's where they are 1.0's). Before the code nothing says whether a number has an account — anyone can
    type one — except the refusal 1.0's admin form gave ("A user with this phone number already exists"), said as a way in. */
export const SIGN_UP = {
  title: 'Start your studio',
  lede: 'Leads, quotes and projects in one place. First, how do you work?',
  /** while signing up can't start here, nothing is asked */
  ledeBlocked: 'Leads, quotes and projects in one place.',
  memberTitle: 'Ask your studio to add you',
  memberLede: 'Your studio’s Owner or an Admin adds you on Company › Members. A text with a link brings you in — there’s no sign-up.',
  memberLine: 'Already added? Sign in with the number your studio has for you.',
  detailsTitle: { studio: 'About your studio', solo: 'About your business' },
  detailsLede: 'We’ll send a 6-digit code to your mobile to check it’s you.',
  studioLabel: { studio: 'Studio name', solo: 'Business name' },
  soloHelper: 'Your own name works too — change it any time on Company › Profile.',
  plan: 'You start on Free: 150 AI credits to try the tools, then 30 a month. Upgrade any time.',
  codeTitle: 'Enter your code',
  go: 'Start my studio',
  going: 'Starting your studio…',
  prototype: 'Demo only — your studio opens on its own here, and the demo studio stays as it is: switch between them from the studio menu.',
  haveAccount: 'Already on OpenMaison?',
  studioNeeded: 'Enter your studio’s name',
  businessNeeded: 'Enter your business name',
  nameLong: `Keep the name to ${NAME_MAX} characters`,
  ownerNeeded: 'Enter your name',
  personLong: `Keep your name to ${PERSON_MAX} characters`,
  phoneNeeded: 'Enter your mobile number',
  phoneTaken: 'This number already has an account — sign in with it instead',
  emailTaken: 'This email already has an account — sign in with it instead',
  paused: 'Contact support for account setup',   // 1.0's, while sign-ups are paused
  pausedTitle: 'Sign-ups are paused',
  full: `This prototype holds ${MAX_PROTOTYPE_STUDIOS} studios already — reset the prototype to start again`,
  noHome: 'This server can’t start a new studio — each studio needs its own database, which the developers set up',
  couldnt: 'Couldn’t start your studio — please try again',
  /** sign-in's door, under its form */
  door: 'New to OpenMaison?',
  doorLink: 'Start your studio',
  /** (pending modules S36) a room photo brought from the website's AI Visualizer trial */
  carried: 'Your room photo from the free trial comes with you — it opens in your studio’s AI Visualizer.',
} as const
