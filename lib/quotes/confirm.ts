/**
 * (REG-587) The confirmation link — Mavid's flow: the client reads the quote and confirms it first; the T&Cs and the signature
 * follow on the contract raised from it. Client-safe vocabulary shared by the editor's Send menu and the page.
 * (pending modules S04 — card held:quotes, "the client's link with a token") The address is `/confirm/<token>`: the quote's own
 * `confirm_token`, never its id. A quote made before S04 keeps its id as its token, so the links already in clients' chats keep opening;
 * a quote with no token yet (a port in flight) is opened by its id until it gets one. Pure: the address, the words, the key.
 */
export const confirmPath = (token: string) => `/confirm/${token}`
export const confirmLink = (token: string) => (typeof window === 'undefined' ? confirmPath(token) : `${window.location.origin}${confirmPath(token)}`)
/** The key a quote's confirmation link carries — its token, else (no token yet) its id. */
export const confirmKeyOf = (q: { id: string; confirmToken?: string | null }) => q.confirmToken || q.id
/** A key as the address may carry it — 2.0's own token (22 characters), a quote id kept as one (36), or 1.0's; nothing else is looked up. */
export const isConfirmKey = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(t)

/** (Projects round 5, F-07) A variation order's draft: what it changes the contract by, and that the client approves it on the link. */
export function variationMessage(o: { clientFirst: string; studio: string; number: string; link: string; change: string }): string {
  return `Hi ${o.clientFirst}, here is variation order ${o.number} from ${o.studio} — it changes your contract by ${o.change}: ${o.link}\n\nOpen the link, check the changes, and tap Approve if you’re happy with them. Do let me know if anything needs a change first.`
}
/** The WhatsApp draft the Send menu opens with (invented copy, the contract's draft as its model — REG-534). */
/** (UX audit Q10) A revision (version 2 on) says so: "here is the revised quote OM-10023 (version 2)" — not the first send's words again. */
/** (S44F — NB-02 (b)) `changes` — on a revision, what changed since the last version (`summaryText`, the client's words), after the link. */
export function confirmMessage(o: { clientFirst: string; studio: string; number: string; link: string; version?: number; changes?: string | null }): string {
  const what = o.version && o.version > 1 ? `the revised quote ${o.number} (version ${o.version})` : `quote ${o.number}`
  const changes = o.version && o.version > 1 && o.changes?.trim() ? `\n\n${o.changes.trim()}` : ''
  return `Hi ${o.clientFirst}, here is ${what} from ${o.studio} for your review: ${o.link}${changes}\n\nOpen the link, check the details, and tap Confirm if you’re happy to go ahead. The agreement and the signature follow once you have. Do let me know if anything needs a change first.`
}
