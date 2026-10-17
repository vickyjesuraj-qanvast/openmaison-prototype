import type { Linked } from '@/lib/settings/copy'

/**
 * (pending modules S17 — consistency leftovers) Company pages' own words, kept once: the page and its ghost (components/company/company-ghosts.tsx,
 * REG-708) read them here, so the ghost's sentence is the page's and wraps where the page's does — the Members and Profile ghosts had said
 * sentences their pages no longer said. A line with a link is kept as its parts (`Linked`). Client-safe, pure.
 */

/* Company › Profile */
export const PROFILE_DETAILS_HELP = 'What the templates print through their fields — {studio_name}, {studio_uen}, {studio_address} and the rest.'
/** (Dane UAT 2.02) what "as you want them printed" means — a handle prints exactly as typed (REG-618) */
/** (pending modules S31) the example is the studio's own handle — "@demostudio.sg" for the demo */
export const profileSocialHelp = (studio: string) => `Handles or links, as you want them printed — e.g. @${studio.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'yourstudio'}.sg. {studio_social} prints the filled ones in a line; the Social links element on a template prints each with its mark.`
export const PROFILE_SOCIAL_HELP = profileSocialHelp('Demo Studio')
export const PROFILE_TAGLINE_HELPER = 'Prints where a template places {studio_tagline} — a cover, a footer.'
export const PROFILE_REGISTRATIONS_HELP: Linked = { lead: 'The studio’s own, recorded once here. The ', link: 'Compliance Navigator', end: ' shows each one’s steps beside it; CaseTrust, once done, puts its deposit-protection disclosure on every signing page.' }
/** the CaseTrust row's own line (what done puts on the signing pages) — in place of the Navigator's subtitle */
export const CASETRUST_ROW_HELP = 'Every signing page shows the CaseTrust deposit-protection disclosure; the client ticks that they read it before they sign, and the tick is kept with the signature.'
export const PROFILE_ENTITIES_HELP = 'The companies you quote under. A quote’s Issuing Entity picks one; a template’s Bank details block prints its bank, account and PayNow QR.'
export const ENTITY_GST_WORDS = { label: 'GST-registered', help: '· off turns GST off on quotes raised under it' } as const
export const ENTITY_QR_HELP = { set: 'Prints beside the bank details where the block shows the QR.', none: 'Upload the PayNow QR your bank gives you; it prints beside the bank details.' } as const

/* Company › Members */
export const MEMBERS_HELP: Linked = { lead: 'Owners and Admins run the studio and assign any lead; only an Owner makes another Owner, and nobody changes their own role. A Manager assigns within their team — the Designers who report to them. A Designer keeps the leads assigned to them. Accounting keeps the books — Finance and each project’s money, never a lead. Who sees which leads is set under ', link: 'Settings › Roles & access', end: '.' }
export const MEMBERS_READ_ONLY = 'Only Owners and Admins add members and change another member’s details, roles or reporting lines.'
