import { runsStudio } from '@/lib/settings/roles'
import { htmlToPlain } from '@/lib/quotes/items-model'

/**
 * (pending modules S37 — her "build all of them" 2026-10-11; cards onboarding:qanvast-listing-verification · studio:verify-listing) THE STUDIO'S
 * LISTING ON QANVAST — pure and client-safe.
 *
 * 1.0 had a form at /verify (no menu reached it) asking for the studio's name, its registration ID, a description, what makes it different, the
 * projects it delivered and two proof uploads; Submit only changed the page's own banner — nothing was saved or sent — and Platform admin ›
 * Verification listed hard-coded samples. 2.0 builds the job in its right form: **a real application, kept as a record** (`studio_verifications`,
 * 1.0's own table name), **made from what the studio already keeps** — its name and UEN (Company › Profile), the registrations it has recorded,
 * its completed projects (counted, never typed), its About photos, year and awards, its review link — so it types only what isn't on record:
 * the description, what makes it different, and its proof files (real bytes). Its one home is Company › Profile's card **Listed on Qanvast**:
 * Not applied · Waiting for Qanvast · Needs changes (with Qanvast's note) · Listed. Only Owners and Admins apply (1.0: the owner alone).
 *
 * Qanvast's answer is Qanvast's (verifying a studio is its staff's work — Platform admin, out of this build by her word): it arrives through the
 * seam (lib/qanvast-listing/service.ts, the registry's `qanvast-listing` · `qanvast-listing-webhook`) as 1.0's two answers — `verified` (Listed)
 * or `rejected` with a note (Needs changes: 1.0's rejection asked the studio to "review the feedback below and resubmit"). While the stand-in
 * answers, the card says so and lets an Owner or an Admin play either answer — labelled "(demo)", recorded as `answered_via = 'demo'`, never
 * as Qanvast's.
 */

export type ListingKind = 'apply' | 'update' | 'outside'
export type ListingStatus = 'pending' | 'verified' | 'rejected' | 'withdrawn' | 'closed'
export type ListingVia = 'qanvast' | 'demo'
export type ProofKind = 'project' | 'testimonial'
export type ListingOutcome = 'verified' | 'rejected'

/** 1.0's two upload boxes — "Proof of Delivered Projects" and "Proof of Testimonials" — each a list now. (invented copy) */
export const PROOF_KINDS: readonly { key: ProofKind; label: string; help: string }[] = [
  { key: 'project', label: 'Proof of homes you finished', help: 'Photos of finished homes, a handover form or a portfolio PDF — from before OpenMaison too.' },
  { key: 'testimonial', label: 'What clients said', help: 'Screenshots of reviews or a client’s own words.' },
]
export const PROOF_MAX_PER_KIND = 10
/** 1.0's "PDF, JPG, PNG" (WebP too, as every picture box takes it); up to 8 MB each — the Files tab's own cap (lib/leads/file-model.ts). */
export const PROOF_ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp'
export const PROOF_TYPES = /^(application\/pdf|image\/(png|jpeg|webp))$/
export const PROOF_HELPER = 'PDF, JPG or PNG up to 8 MB each — kept with your studio as you add them'
export const DESCRIPTION_MAX = 2000
export const DIFFERENTIATOR_MAX = 600
export const NOTE_MAX = 600

/** The registrations Company › Profile records (lib/compliance/studio-actions.ts), as an application names them. */
export const REGISTRATION_NAMES: Record<string, string> = {
  HDB_DRC: 'HDB Directory of Renovation Contractors',
  CASETRUST_RENOVATION: 'CaseTrust',
  BIZSAFE_ENTERPRISE: 'bizSAFE Enterprise',
  BCA_CONTRACTORS: 'BCA licensed contractor',
  ACRA_BIZFILE: 'ACRA business profile',
}
export const registrationName = (id: string) => REGISTRATION_NAMES[id] ?? id

/** What the studio's records said the day it sent an application — kept with it (`studio_verifications.submitted_documents`). */
export type SentDocuments = {
  registrations: string[]
  photos: string[]
  files: { id: string; kind: ProofKind; name: string }[]
  reviewLink: string | null
  website: string | null
  founded: number | null
  awards: string[]
}
export const EMPTY_SENT: SentDocuments = { registrations: [], photos: [], files: [], reviewLink: null, website: null, founded: null, awards: [] }
export function parseSentDocuments(v: unknown): SentDocuments {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!raw || typeof raw !== 'object') return EMPTY_SENT
  const r = raw as Record<string, unknown>
  const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && !!s) : [])
  const text = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null)
  const files = Array.isArray(r.files) ? r.files.flatMap((f) => {
    const o = (f ?? {}) as Record<string, unknown>
    return typeof o.id === 'string' && (o.kind === 'project' || o.kind === 'testimonial') ? [{ id: o.id, kind: o.kind as ProofKind, name: typeof o.name === 'string' ? o.name : 'A file' }] : []
  }) : []
  return {
    registrations: strings(r.registrations), photos: strings(r.photos), files, reviewLink: text(r.reviewLink), website: text(r.website),
    founded: typeof r.founded === 'number' && Number.isFinite(r.founded) ? r.founded : null, awards: strings(r.awards),
  }
}

/** One application as the card reads it. */
export type ListingApp = {
  id: string
  kind: ListingKind
  status: ListingStatus
  studioName: string | null
  uen: string | null
  description: string | null
  differentiator: string | null
  projectsDelivered: number | null
  sent: SentDocuments
  submittedAt: number
  /** who sent it, by name (null: the outside listing, or a member no longer on the team) */
  submittedBy: string | null
  reviewedAt: number | null
  /** Qanvast's note with its answer */
  note: string | null
  via: ListingVia | null
}

export type ListingState = 'not_applied' | 'waiting' | 'needs_changes' | 'listed'
export type ListingRead = {
  state: ListingState
  /** the listing as Qanvast has it: the latest application it approved (or the outside listing) */
  listed: ListingApp | null
  /** when the studio was first listed */
  since: number | null
  /** an application waiting for Qanvast's answer — the first one, or changes to a listing */
  pending: ListingApp | null
  /** Qanvast's ask for changes the studio hasn't answered or let go — on the first application, or on an update */
  asked: ListingApp | null
  /** the newest application with the studio's own words — withdrawn or closed ones too, so the next one starts from them (nothing lost) */
  lastWords: ListingApp | null
}

const answeredAt = (a: ListingApp) => a.reviewedAt ?? a.submittedAt
/** The studio's listing, read from its applications (withdrawn and closed ones are history only). */
export function readListing(apps: readonly ListingApp[]): ListingRead {
  const verified = apps.filter((a) => a.status === 'verified').sort((x, y) => answeredAt(x) - answeredAt(y))
  const listed = verified.at(-1) ?? null
  const since = verified[0] ? answeredAt(verified[0]) : null
  const pending = apps.filter((a) => a.status === 'pending').sort((x, y) => x.submittedAt - y.submittedAt).at(-1) ?? null
  const lastAsk = apps.filter((a) => a.status === 'rejected').sort((x, y) => answeredAt(x) - answeredAt(y)).at(-1) ?? null
  const asked = !pending && lastAsk && (!listed || answeredAt(lastAsk) > answeredAt(listed)) ? lastAsk : null
  const lastWords = apps.filter((a) => !!a.description).sort((x, y) => x.submittedAt - y.submittedAt).at(-1) ?? null
  return { state: listed ? 'listed' : pending ? 'waiting' : asked ? 'needs_changes' : 'not_applied', listed, since, pending, asked, lastWords }
}

/** What the studio's records say today — the part of an application nobody types. */
export type ListingFacts = {
  studioName: string
  uen: string
  /** the registrations recorded as done on Company › Profile */
  registrations: string[]
  /** the studio's completed projects (counted, never typed) */
  projectsDelivered: number
  /** the About page's photos, in their order */
  photos: { id: string; src: string }[]
  reviewLink: string | null
  website: string | null
  founded: number | null
  awards: string[]
  /** the About story as plain words — the description's first draft when nothing was sent before */
  story: string
}

/** A proof file on the studio's list (its bytes open at `href`). */
export type ProofFile = { id: string; kind: ProofKind; name: string; mime: string; size: number; href: string }

/** The card's whole read. */
export type ListingView = { read: ListingRead; facts: ListingFacts; files: ProofFile[]; standIn: boolean }

/* ── who ── */
export const LISTING_RULE = 'Only Owners and Admins apply to Qanvast or change the studio’s listing'
/** 1.0's /verify was the owner's alone (src/lib/access-control.ts `verify: ["owner"]`); 2.0's Company › Profile is the Owners' and Admins'. */
export const listingBlock = (role: string | null | undefined): string | null => (runsStudio(role) ? null : LISTING_RULE)

/* ── the first draft of the words ── */
/** The About story as the description's first draft: its paragraphs, a blank line between, cut at the box's length on a sentence. */
export function storyToDescription(html: string): string {
  const plain = htmlToPlain(html ?? '').split('\n').filter((l) => l.trim()).join('\n\n')
  if (plain.length <= DESCRIPTION_MAX) return plain
  const cut = plain.slice(0, DESCRIPTION_MAX)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'))
  return (end > DESCRIPTION_MAX / 2 ? cut.slice(0, end + 1) : cut).trim()
}
/** The words an application starts with: what was last sent (the one Qanvast asked changes on, else the newest — a withdrawn one too), else
    the About story. */
export function draftOf(read: ListingRead, facts: ListingFacts): { description: string; differentiator: string } {
  const from = read.asked ?? read.pending ?? read.lastWords ?? read.listed
  if (from?.description) return { description: from.description, differentiator: from.differentiator ?? '' }
  return { description: storyToDescription(facts.story), differentiator: from?.differentiator ?? '' }
}

/** Whether the first draft is the About story (nothing was sent with words before) — the description's helper says so. */
export const draftIsStory = (read: ListingRead): boolean => !(read.asked ?? read.pending ?? read.lastWords ?? read.listed)?.description

/* ── the prototype's play of Qanvast's answer ── */
/** (demo only) The note a played "asks for changes" carries — by rule, from what the application lacks; 1.0's staff placeholder was
    "Please resubmit with a valid ACRA certificate." (invented copy) */
export function demoChangesNote(sent: SentDocuments): string {
  if (!sent.files.some((f) => f.kind === 'project')) return 'Please add photos of a few homes you finished, or a portfolio PDF, so we can see your work.'
  if (!sent.files.some((f) => f.kind === 'testimonial') && !sent.reviewLink) return 'Please add what a client said about your work — a review, a message or a testimonial.'
  return 'Please add your ACRA business profile (BizFile+) so we can check your UEN.'
}

/** The bell's words for Qanvast's answer — the studio's Owners and Admins hear it (1.0 promised "notified via email and in-app"). */
export function answerNotice(o: { outcome: ListingOutcome; kind: ListingKind; studio: string; note: string | null; via: ListingVia }): { title: string; body: string } {
  const demo = o.via === 'demo' ? ' · Simulated on this prototype' : ''
  if (o.outcome === 'verified') {
    return o.kind === 'update'
      ? { title: 'Qanvast approved your listing changes', body: `Your listing on Qanvast shows them now${demo}` }
      : { title: `Qanvast listed ${o.studio}`, body: `Homeowners find you on Qanvast now${demo}` }
  }
  return { title: o.kind === 'update' ? 'Qanvast asks for changes to your listing update' : 'Qanvast asks for changes to your application', body: `${o.note?.trim() || 'Open your application to see what to change'}${demo}` }
}

/* ── the card's words (the page and its ghost read the same ones) ── (invented copy) */
export const LISTING_WORDS = {
  title: 'Listed on Qanvast',
  helpNot: 'Homeowners look for interior designers on Qanvast. Apply once — Qanvast checks your studio, usually within 3–5 working days, and lists it; leads from your Qanvast profile then arrive in Leads.',
  helpListed: 'Homeowners find your studio on Qanvast, and leads from your Qanvast profile arrive in Leads. Send Qanvast your changes from here whenever your studio’s details move on.',
  chip: { not_applied: 'Not applied', waiting: 'Waiting for Qanvast', needs_changes: 'Needs changes', listed: 'Listed' } satisfies Record<ListingState, string>,
  apply: 'Apply to be listed',
  update: 'Update your listing',
  fix: 'Fix and send again',
  withdraw: 'Withdraw the application',
  withdrawChanges: 'Withdraw your changes',
  closeAsk: 'Close the application',
  keepListing: 'Keep my listing as it is',
  what: 'What Qanvast has',
  outside: 'Listed before your studio used OpenMaison — what Qanvast shows isn’t on record here yet.',
  demoLead: 'Demo only — Qanvast’s real answer arrives through its feed. Play one:',
  playListed: 'Simulate Qanvast listing you (demo)',
  playApproved: 'Simulate Qanvast approving the changes (demo)',
  playChanges: 'Simulate Qanvast asking for changes (demo)',
} as const

/** (pending modules S37) Company › Integrations' Qanvast card follows the listing: Connected while Qanvast lists the studio (its leads come
    through), Not listed before — each with the door to its one home. The page and its ghost read the same words. (invented copy) */
export const QANVAST_CONNECTION = {
  listed: { chip: 'Connected', lead: 'Leads from your Qanvast profile arrive as New with the source Qanvast. Return Lead sends one back with a reason; ', returns: 'Qanvast Ops › Leads', mid: ' shows every return. Your listing: ', link: 'Company › Profile', end: '.' },
  notListed: { chip: 'Not listed', lead: 'Once Qanvast lists your studio, leads from your Qanvast profile arrive as New with the source Qanvast. Apply on ', link: 'Company › Profile', end: '.' },
} as const
export const qanvastConnectionText = (listed: boolean): string => {
  const w = QANVAST_CONNECTION
  return listed ? `${w.listed.lead}${w.listed.returns}${w.listed.mid}${w.listed.link}${w.listed.end}` : `${w.notListed.lead}${w.notListed.link}${w.notListed.end}`
}
