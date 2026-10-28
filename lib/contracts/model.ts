/** Contract records (REG-534) — client-safe vocabulary shared by the tab, the editor, the studio list and the signing page. */
import type { ContractStatus } from '@/lib/leads/contract-filters'
import { displayDayShortMonth } from '@/lib/format'   // (the calm UI build 2026-10-27, 4-43) the house months — "Sep", never the locale's "Sept"

export type { ContractStatus }
/** Where a contract's Send lands: the client's signing page (the 1.0 flow — a link shared on WhatsApp, verified by a code on the phone).
 *  (pending modules S03) Keyed on the contract's own signing token (`contracts.sign_token`, lib/contracts/link.ts), never on its id. */
export const signingPath = (token: string) => `/sign/${token}`
export const signingLink = (token: string) => (typeof window === 'undefined' ? signingPath(token) : `${window.location.origin}${signingPath(token)}`)
/** The contract's own link key — its token (every contract has one: new ones are made with it, older ones keep their id as it). */
export const tokenOf = (c: { id: string; signToken?: string | null }) => c.signToken || c.id

/** The WhatsApp draft the Send dialog opens with (invented copy — REG-534). */
export function signingMessage(o: { clientFirst: string; studio: string; title: string; link: string }): string {
  return `Hi ${o.clientFirst}, here is the ${o.title} from ${o.studio} for your review and signature: ${o.link}\n\nOpen the link, check the details, and sign at the bottom. You’ll get a one-time code on this number to confirm it’s you. Do let me know if anything needs a change first.`
}
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
/** (UX audit C5, invented copy) Send a reminder's WhatsApp draft — the same link, a nudge. */
export function reminderMessage(o: { clientFirst: string; studio: string; title: string; link: string }): string {
  return `Hi ${o.clientFirst}, a gentle reminder — the ${o.title} from ${o.studio} is still waiting for your signature: ${o.link}\n\nIt takes a minute: open the link, read it through and sign at the bottom. Do let me know if anything needs a change first.`
}
/**
 * (UX audit C5) How long a contract has waited for its signature, and whether the client opened it. `full` — "Sent 3d ago · not opened",
 * "Sent 3d ago · opened 2d ago" — where there is room (a phone's card, which has no Sent column); `short` — "Not opened in 3d", "Opened 2d
 * ago" — under the status in the table's 128 column, beside the Sent date.
 */
export function awaitingLine(c: { sentAt: Date | null; viewedAt: Date | null; /** (pending modules S03) */ signExpiresAt?: Date | null }, now: number): { full: string; short: string; expired?: boolean } | null {
  if (!c.sentAt) return null
  /* (pending modules S03) past its window the link no longer signs — that, not the opening, is what the studio has to act on */
  if (c.signExpiresAt && c.signExpiresAt.getTime() <= now) { const day = displayDayShortMonth(c.signExpiresAt); return { full: `Link expired ${day} · send it again`, short: `Link expired ${day}`, expired: true } }
  const span = (at: number) => { const d = Math.floor((now - at) / 86_400_000); if (d >= 1) return `${d}d`; const h = Math.floor((now - at) / 3_600_000); return h >= 1 ? `${h}h` : '' }
  const ago = (at: number) => { const t = span(at); return t ? `${t} ago` : 'just now' }
  const sent = c.sentAt.getTime(), seen = c.viewedAt?.getTime() ?? null
  return {
    full: `Sent ${ago(sent)} · ${seen ? `opened ${ago(seen)}` : 'not opened'}`,
    short: seen ? `Opened ${ago(seen)}` : span(sent) ? `Not opened in ${span(sent)}` : 'Not opened yet',
  }
}

/** "Saved just now" / "Saved 2 mins ago" — (the calm UI build 2026-10-27, 4-43 · W-353) the house `savedLabel` (lib/format.ts), every editor's one stamp. */
export { savedLabel } from '@/lib/format'

/** "25 August 2026" — how a contract prints a date (not the listing's "25 Aug ’26"). */
export const longDate = (d: Date) => d.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })

/** (REG-591) Several documents under one signing link — the bundle's page. */
export const bundleSigningPath = (bundleId: string) => `/sign/bundle/${bundleId}`
export const bundleSigningLink = (bundleId: string) => (typeof window === 'undefined' ? bundleSigningPath(bundleId) : `${window.location.origin}${bundleSigningPath(bundleId)}`)
/** The WhatsApp draft Send together opens with (invented copy on the single link's model). */
export function bundleMessage(o: { clientFirst: string; studio: string; titles: string[]; link: string }): string {
  return `Hi ${o.clientFirst}, here are ${o.titles.length} documents from ${o.studio} for your review and signature — ${o.titles.join(', ')}: ${o.link}\n\nOpen the link, read each one, and sign once at the bottom; your signature covers all of them. You’ll get a one-time code on this number to confirm it’s you.`
}

/** (REG-633, contracts parity E-118) A document out for signature in a bundle is signed through the bundle's one link — every screen copies that one. */
export const contractLink = (c: { id: string; signToken?: string | null; bundleId: string | null; status: string }) => (c.bundleId && c.status === 'Sent to Client' ? bundleSigningLink(c.bundleId) : signingLink(tokenOf(c)))

/* ── (S42 B-03 · call B·2) The signing code, said honestly while the prototype's SMS stand-in answers (lib/auth/provider.ts) ───────────── */
/** The client's code step — the portal's line (S34), word for word for signing. */
export const SIGN_CODE_DEMO = 'Demo only — no text is sent: any six digits sign it.'
/** (The calm UI build 2026-10-27, 4-20 · W-448) The Send dialog's one line in its head; the code's demo note and the link's window wait under
 *  "How signing works" (components/contracts/editor/dialogs.tsx). */
export const SIGN_SEND_LINE = 'Your client signs on their phone; a one-time code confirms it’s them.'
/** The studio's Send dialogs: how the client confirms it's them. */
export const signCodeLine = (demo: boolean) => (demo ? 'A one-time code confirms it’s them — demo only: no text is sent, any six digits sign it.' : 'A one-time code on their phone confirms it’s them.')
/** The signing page's refusal when the provider says the code isn't the one sent. */
export const SIGN_CODE_WRONG = 'That code isn’t right — check it and try again'
