import type { Linked } from '@/lib/settings/copy'

/**
 * (pending modules S17 — consistency leftovers) Company pages' own words, kept once: the page and its ghost (components/company/company-ghosts.tsx,
 * REG-708) read them here, so the ghost's sentence is the page's and wraps where the page's does — the Members and Profile ghosts had said
 * sentences their pages no longer said. A line with a link is kept as its parts (`Linked`). Client-safe, pure.
 */

/* Company › Profile */
/** (the calm UI build 2026-10-27 — 5-35 · W-433) the studio's words, not the template editor's field codes (they are in its Insert field menu) */
export const PROFILE_DETAILS_HELP: Linked = { lead: 'These print on your quotes, invoices and contracts — with the logo and colours of your ', link: 'Brand kit', end: '.' }
/** (Dane UAT 2.02) what "as you want them printed" means — a handle prints exactly as typed (REG-618) */
/** (pending modules S31) the example is the studio's own handle — "@demostudio.sg" for the demo */
export const profileSocialHelp = (studio: string) => `As you want them printed, e.g. @${studio.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'yourstudio'}.sg.`   // (W-207)
export const PROFILE_SOCIAL_HELP = profileSocialHelp('Demo Studio')
export const PROFILE_TAGLINE_HELPER = 'A short line for your quote cover or footer.'   // (W-320)
export const PROFILE_REGISTRATIONS_HELP: Linked = { lead: 'The studio’s own, recorded once here. The ', link: 'Compliance Navigator', end: ' shows each one’s steps beside it; CaseTrust, once done, puts its deposit-protection disclosure on every signing page.' }
/** the CaseTrust row's own line (what done puts on the signing pages) — in place of the Navigator's subtitle */
export const CASETRUST_ROW_HELP = 'Every signing page shows the CaseTrust deposit-protection disclosure; the client ticks that they read it before they sign, and the tick is kept with the signature.'
export const PROFILE_ENTITIES_HELP = 'The companies you quote under. A quote’s Issuing Entity picks one; a template’s Bank details block prints its bank, account and PayNow QR.'
export const ENTITY_GST_WORDS = { label: 'GST-registered', help: '· off: quotes under this company have no GST' } as const   // (W-206)
export const ENTITY_QR_HELP = { set: 'Prints beside the bank details where the block shows the QR.', none: 'Upload the PayNow QR your bank gives you; it prints beside the bank details.' } as const

/* Company › Members */
/** (the calm UI build 2026-10-27 — 5-02) The five-line roles paragraph left the page: the rules live in Settings › Roles & access (What each role
    can do, Who sees leads), and the list ends with the two doors to them. */
export const MEMBERS_LINKS = { roles: 'What can each role do?', rolesHref: '/settings?section=studio#studio-roles', visibility: 'Who sees which leads' } as const
export const MEMBERS_READ_ONLY = 'Only Owners and Admins add members and change another member’s details, roles or reporting lines.'
/** (the calm UI build 2026-10-27 — 5-01 · 5-03 · W-054 · W-057 · W-142 · W-350 · W-374 · W-389) The member drawer's and the row's words. */
export const MEMBER_DRAWER = {
  label: (name: string) => `${name} — details, leads and pay`,
  details: 'Details', leads: 'Leads', pay: 'Pay', profile: 'Public profile',
  yourSignature: 'Your signature isn’t set yet', signatureOf: (name: string) => `Signature not set — ${name.split(' ')[0]} adds it from Signature on any quote they prepare`,
  addSignature: 'Add your signature',
  preferences: 'Lead preferences', setPreferences: 'Set preferences',
  capacity: 'Max projects', usual: (n: number) => `${n} (studio usual)`,
  noManager: 'No manager',
  noPayNow: 'Not added',
  shown: 'Shown on your client portal', notShown: 'Not on your client portal', openProfile: 'Open public profile',
  closed: 'Not taking new leads',
  team: (names: string[]) => (names.length ? `Team: ${names.join(', ')}` : 'No designers report to them yet'),
} as const
