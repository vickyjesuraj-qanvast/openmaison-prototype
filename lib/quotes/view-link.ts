/*
 * (pending modules S02 — 1.0's `/quote-preview/[token]`, the Quote Digitizer's *Share live preview*) The quote's view-only link: the client
 * sees the quote as the studio has it now — the client view exactly as Preview prints it — and it follows the studio's edits. Nothing on it
 * confirms or signs; that stays Send for confirmation (`/confirm/<id>`) and the contract's signing link. One link per quote
 * (`quotes.view_token`); Stop ends it and sharing again makes a new address. Pure: the address, the words, the rule.
 */

export const viewPath = (token: string) => `/quote/${token}`
export const viewLink = (token: string) => (typeof window === 'undefined' ? viewPath(token) : `${window.location.origin}${viewPath(token)}`)
/** A token as an address may carry it — 2.0's own (22 characters) or one ported from 1.0 (48 hex characters); anything else is never looked up. */
export const isViewToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(t)
/** How often an open page asks whether the quote changed (1.0 polled every 5 s); it asks only while the page is in front. */
export const VIEW_POLL_MS = 10_000

/** The WhatsApp draft (invented copy, Send for confirmation's draft as its model). */
export function viewMessage(o: { clientFirst: string; studio: string; number: string; link: string }): string {
  return `Hi ${o.clientFirst}, here is a first look at quote ${o.number} from ${o.studio}: ${o.link}\n\nIt’s view only, and it updates as we work on it — check back any time. Do let me know if anything needs a change.`
}

/** The kebab's row is for a quote, not a variation order (its client approves it on the confirmation link). */
export const offersViewLink = (kind: string | null | undefined) => kind !== 'variation'

/** Before the studio's own approval: with quote approval on, a Draft or a quote waiting for approval is not the client's to see (REG-624, Q3). */
const awaitingApproval = (o: { status: string; approval: string }) => o.approval === 'required' && (o.status === 'Draft' || o.status === 'Sent for Approval')

/**
 * Who may hand the client a look: whoever may send the quote to the client, once the client may see it. With quote approval on, a quote not
 * yet approved reaches no client (REG-624, Q3) — the row says why in the status menu's words, and an approver's says what to do. An archived
 * quote is put back first. `null` = the link may be made. A studio that does not review quotes shares a Draft, live, as 1.0 did.
 */
export function viewLinkBlock(o: { status: string; approval: string; approver: boolean; archived: boolean }): string | null {
  if (o.archived) return 'An archived quote isn’t shared — unarchive it first'
  if (awaitingApproval(o)) return o.approver ? 'Approve it first — the client sees a quote once it’s approved' : 'It needs an approver’s OK first — send it for approval'
  return null
}

/** Whether the page shows the quote now: never while it waits for the studio's approval — a revision (back to Draft) shows "Not ready yet"
    until it is approved again, so a client never sees an edit nobody approved. */
export const viewShows = (o: { status: string; approval: string }) => !awaitingApproval(o)

/** What the page's card says under the quote's title, by where the quote stands. */
export function viewCardWords(o: { status: string; clientFirst: string; studio: string; designerFirst: string; confirmedBy: string | null; confirmedOn: string | null }): string {
  if (o.status === 'Signed') return `Hi ${o.clientFirst}, this quote is signed. ${o.studio} keeps a copy of the agreement with you.`
  if (o.status === 'Confirmed') return `Hi ${o.clientFirst}, this quote was confirmed${o.confirmedBy ? ` by ${o.confirmedBy}` : ''}${o.confirmedOn ? ` on ${o.confirmedOn}` : ''}. It stays here for you to look at.`
  return `Hi ${o.clientFirst}, this is the quote ${o.designerFirst} is preparing for you. It updates here as they work on it — there’s nothing to confirm or sign on this page.`
}
/** The card while the quote waits for the studio's approval (a revision on its way). */
export const notReadyWords = (o: { clientFirst: string; studio: string }) => `Hi ${o.clientFirst}, ${o.studio} is updating this quote. It’ll be back here once it’s ready.`
