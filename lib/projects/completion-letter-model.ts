/**
 * (S44R — UAT row 359, call C9) The completion letter's words the Hand over sheet drafts — pure and client-safe (invented copy, S44R).
 */
/** The letter's WhatsApp: to read and keep, or the house signing message's own words (lib/contracts/model.ts `signingMessage`). */
export function letterMessage(o: { clientFirst: string; studio: string; title: string; link: string; toRead: boolean }): string {
  return o.toRead
    ? `Hi ${o.clientFirst}, here is your ${o.title} from ${o.studio}: ${o.link}\n\nIt is yours to keep — there is nothing to sign.`
    : `Hi ${o.clientFirst}, here is your ${o.title} from ${o.studio} for your review and signature: ${o.link}\n\nOpen the link, check the details, and sign at the bottom. You’ll get a one-time code on this number to confirm it’s you.`
}
/** The defects period the sheet starts with — 12 months, Singapore's usual defects liability period. */
export const DEFAULT_DEFECTS_MONTHS = 12
export const DEFECTS_MONTHS_MAX = 60
/** The letter's line when the thank-you goes in the same WhatsApp — one message, never two greetings. */
export function letterLine(o: { title: string; link: string; toRead: boolean }): string {
  return `Your ${o.title} is here — ${o.toRead ? 'it is yours to keep' : 'please read it and sign at the bottom'}: ${o.link}`
}
/** What the Hand over sheet hands back once the letter went (the server's `IssuedLetter`). */
export type IssuedLetterView = { id: string; title: string; path: string; toRead: boolean }
