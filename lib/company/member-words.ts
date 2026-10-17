/**
 * (S42 audit A-02 · A-15) A member's details as Your profile and Company › Members › Edit details say them — one place for the page, the dialog
 * and the page's ghost, so they never read two ways. `onLeads`: a member who holds leads and prepares quotes (everyone but Accounting).
 * *(invented copy, for Vicky)*
 */

/** Your profile › Your details' line under its title. */
export const detailsHelp = (onLeads: boolean, marketing = false): string => marketing
  /* (S43E, S44O's walk W6-01) Marketing holds no lead and handles no invoice: it adds leads and puts members on them *(invented copy)* */
  ? 'Your name and photo show wherever you appear in the studio — on the leads you add and the members you put on them, in each lead’s Activity.'
  : onLeads
  ? 'Your name and photo show wherever you appear in the studio — on the leads you hold, the quotes you prepare and in the messages clients read.'
  : 'Your name and photo show wherever you appear in the studio — on the invoices, orders and payments you handle and in the messages clients read.'

/** The Email field's helper — Accounting prepares no quotes: their email is on the papers they send. */
export const emailHelp = (own: boolean, onLeads: boolean, marketing = false): string => marketing
  ? `${own ? 'You' : 'They'} can sign in with it, and the studio’s emails go there`   /* (S43E W6-01) Marketing sends no papers *(invented copy)* */
  : onLeads ? `Printed as ${own ? 'your' : 'their'} email on the quotes ${own ? 'you' : 'they'} prepare` : `Shown on the papers ${own ? 'you' : 'they'} send`

/** The Phone field's helper — one rule for "a mobile" (S30): it signs them in and carries WhatsApp; a landline does neither. */
export const phoneHelp = (own: boolean, onLeads: boolean): string => `A mobile signs ${own ? 'you' : 'them'} in and gets WhatsApp notices${onLeads ? '; clients see it on their portal' : ''}`
