/**
 * (REG-587) The confirmation link — Mavid's flow: the client reads the quote and confirms it first; the T&Cs and the signature
 * follow on the contract raised from it. Client-safe vocabulary shared by the editor's Send menu and the page.
 */
export const confirmPath = (quoteId: string) => `/confirm/${quoteId}`
export const confirmLink = (quoteId: string) => (typeof window === 'undefined' ? confirmPath(quoteId) : `${window.location.origin}${confirmPath(quoteId)}`)

/** The WhatsApp draft the Send menu opens with (invented copy, the contract's draft as its model — REG-534). */
export function confirmMessage(o: { clientFirst: string; studio: string; number: string; link: string }): string {
  return `Hi ${o.clientFirst}, here is quote ${o.number} from ${o.studio} for your review: ${o.link}\n\nOpen the link, check the details, and tap Confirm if you’re happy to go ahead. The agreement and the signature follow once you have. Do let me know if anything needs a change first.`
}
