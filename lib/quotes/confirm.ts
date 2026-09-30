/**
 * (REG-587) The confirmation link — Mavid's flow: the client reads the quote and confirms it first; the T&Cs and the signature
 * follow on the contract raised from it. Client-safe vocabulary shared by the editor's Send menu and the page.
 */
export const confirmPath = (quoteId: string) => `/confirm/${quoteId}`
export const confirmLink = (quoteId: string) => (typeof window === 'undefined' ? confirmPath(quoteId) : `${window.location.origin}${confirmPath(quoteId)}`)

/** The WhatsApp draft the Send menu opens with (invented copy, the contract's draft as its model — REG-534). */
/** (UX audit Q10) A revision (version 2 on) says so: "here is the revised quote OM-10023 (version 2)" — not the first send's words again. */
export function confirmMessage(o: { clientFirst: string; studio: string; number: string; link: string; version?: number }): string {
  const what = o.version && o.version > 1 ? `the revised quote ${o.number} (version ${o.version})` : `quote ${o.number}`
  return `Hi ${o.clientFirst}, here is ${what} from ${o.studio} for your review: ${o.link}\n\nOpen the link, check the details, and tap Confirm if you’re happy to go ahead. The agreement and the signature follow once you have. Do let me know if anything needs a change first.`
}
