/**
 * Contracts' rules that both the server and the screens read (REG-631, contracts parity Q-04 · Q-07). Client-safe: no DB here.
 */

export type ContractViewer = { id: string | null; role: string | null | undefined }
export const runsStudio = (v: ContractViewer) => v.role === 'Owner' || v.role === 'Admin'

/** (Q-04) A signature the client made online is the record — 1.0 never reopened a signed request (C-03), and neither does 2.0. */
export const CLIENT_SIGNED_RULE = 'Signed by the client online — a signed contract stays signed. Duplicate it to change the terms.'
/** (Q-04) A signature the studio marked (paper, or signed elsewhere) can be corrected — by whoever runs the studio. */
export const UNSIGN_ROLE_RULE = 'Only an Owner or an Admin moves a signed contract back'

/** (REG-634, contracts parity Q-21) Who deletes a contract, and deletes it forever: whoever created it, an Owner or an Admin — the quote's rule (REG-625). */
export const canDeleteContract = (v: ContractViewer, c: { createdBy: string | null }) => runsStudio(v) || (!!v.id && c.createdBy === v.id)
export const CONTRACT_DELETE_RULE = 'Only its creator, an Owner or an Admin deletes a contract'
/** The snackbar after a delete that the rule may have partly refused (the quote's `deletedLine`). */
export function contractsDeletedLine(r: { deleted: number; refused: number }): string {
  if (!r.deleted) return r.refused ? `${CONTRACT_DELETE_RULE}.` : 'Nothing to delete'
  const done = r.deleted === 1 ? 'Contract deleted' : `${r.deleted} contracts deleted`
  return r.refused ? `${done} — ${r.refused} left: ${CONTRACT_DELETE_RULE.charAt(0).toLowerCase()}${CONTRACT_DELETE_RULE.slice(1)}` : done
}
/** (REG-634, parity Q-21 · Q-24) A template is deleted forever by whoever created it, an Owner or an Admin — and never while a live contract names it. */
export const canDeleteTemplateForever = (v: ContractViewer, t: { createdBy: string | null }) => runsStudio(v) || (!!v.id && t.createdBy === v.id)

/** Why a Signed contract cannot move back for this viewer, else null (it may, with a confirm). Not Signed → null. */
export function unsignBlock(c: { status: string; signedBy: string | null }, viewer: ContractViewer): string | null {
  if (c.status !== 'Signed') return null
  if (c.signedBy) return CLIENT_SIGNED_RULE
  if (!runsStudio(viewer)) return UNSIGN_ROLE_RULE
  return null
}

/**
 * (Q-07) What a signing link does. `open` signs; `signed` shows the signed copy; `not-sent` — a Draft, or moved back to Draft — says
 * it is not ready; `inactive` — archived, deleted, or its lead deleted — says the link no longer works (1.0's archived-lead guard, B-73).
 */
/* (pending modules S03) `expired` — out for signature past its window (the studio's Signing links rule, 7 days by default): the page says so
   and asks the client for a new link; a signed link never expires. */
/* (S42 B-01) `quote-updating` — out for signature, but the quote it signs is being revised: the page says "Not ready yet" and carries no
   document, the server refuses a signature, and the link opens again once the quote is back with the client (`quoteHoldsSigning`). */
export type LinkState = 'open' | 'signed' | 'not-sent' | 'inactive' | 'expired' | 'quote-updating'
/**
 * (S42 B-01 — the audit's Blocker: a client signed while the studio was revising the quote, and the unsent draft became the signed quote) Whether
 * the quote an agreement names keeps its signing link waiting. A revision (version 2 on) waits until it is with the client again — sent,
 * confirmed or signed; a first version waits as Send's own check does (REG-634, UX audit C2): a Draft, or one waiting for approval, where
 * Settings requires quote approval. Every signing path asks it — the link, a set's link, Mark as signed and a list's Signed.
 */
export function quoteHoldsSigning(q: { status: string; version: number } | null | undefined, approvalRequired: boolean): boolean {
  if (!q) return false
  if (q.status === 'Sent to Client' || q.status === 'Confirmed' || q.status === 'Signed') return false
  if (q.version > 1) return true
  if (q.status === 'Approved') return false
  return approvalRequired && (q.status === 'Draft' || q.status === 'Sent for Approval')
}
/** (S42 B-01) What the studio hears when it marks a contract signed while its quote is being revised (Mark as signed, a list's Signed). */
export const quoteHoldsSigningRule = (q: { number: string; version: number }) =>
  q.version > 1 ? `Its quote ${q.number} is being revised — send version ${q.version} to the client first` : `Its quote ${q.number} isn’t approved yet — approve and send it first`
export function linkState(c: { status: string; archivedAt: Date | null; deletedAt: Date | null; signExpiresAt?: Date | null }, leadGone: boolean, now: number = Date.now()): LinkState {
  if (c.deletedAt || c.archivedAt || leadGone) return 'inactive'
  if (c.status === 'Signed') return 'signed'
  if (c.status === 'Sent to Client') return c.signExpiresAt && c.signExpiresAt.getTime() <= now ? 'expired' : 'open'
  return 'not-sent'
}

/** (Q-05) The copy kept at signing, as the renderer reads it. */
export type SignedLetterhead = { name: string; line: string; /** (REG-632) an issuing entity's own logo; none = the brand kit's */ logo?: string | null }
export type SignedStudioSignature = { kind: 'draw' | 'type' | 'image'; name: string; data: string | null } | null   // (Dane UAT 6.23) 'image' = an uploaded picture
export type SignedCopy = { body: string | null; letterhead: SignedLetterhead | null; studioSignature: SignedStudioSignature; hash: string | null }
export function signedCopyOf(c: { signedBody: string | null; signedLetterhead: string | null; signedStudioSignature: string | null; documentHash: string | null; status: string }): SignedCopy | null {
  if (c.status !== 'Signed' || (!c.signedBody && !c.documentHash)) return null
  const parse = <T,>(s: string | null): T | null => { if (!s) return null; try { return JSON.parse(s) as T } catch { return null } }
  return { body: c.signedBody, letterhead: parse<SignedLetterhead>(c.signedLetterhead), studioSignature: parse<NonNullable<SignedStudioSignature>>(c.signedStudioSignature), hash: c.documentHash }
}

/** (REG-633, contracts parity Q-15) The tick's words when the studio wrote none — 1.0's library default (B-02). */
export const DEFAULT_ACCEPT_LABEL = 'I have read and agree to this document.'
export const acceptLabelOf = (c: { acceptLabel: string | null }) => c.acceptLabel?.trim() || DEFAULT_ACCEPT_LABEL
/** (REG-633, Q-18) A drawn signature as the pad stores it: moves and lines on the 752×140 box. */
export const DRAWN_PATH = /^[ML0-9. ]{3,20000}$/
/** (REG-633, Q-19) How a device reads on the signing record: the browser and the system, from the user agent. */
export function deviceOf(ua: string): string {
  const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'A browser'
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'an unknown system'
  return `${b} on ${os}`
}

/** A masked NRIC as the signing page sends it (REG-563: the whole number never leaves the page). */
export const MASKED_NRIC = /^•{5}\d{3}[A-Z]$/
