/** Contract records (REG-534) — client-safe vocabulary shared by the tab, the editor, the studio list and the signing page. */
import type { ContractStatus } from '@/lib/leads/contract-filters'

export type { ContractStatus }
/** Where a contract's Send lands: the client's signing page (the 1.0 flow — a link shared on WhatsApp, verified by a code on the phone). */
export const signingPath = (contractId: string) => `/sign/${contractId}`
export const signingLink = (contractId: string) => (typeof window === 'undefined' ? signingPath(contractId) : `${window.location.origin}${signingPath(contractId)}`)

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
export function awaitingLine(c: { sentAt: Date | null; viewedAt: Date | null }, now: number): { full: string; short: string } | null {
  if (!c.sentAt) return null
  const span = (at: number) => { const d = Math.floor((now - at) / 86_400_000); if (d >= 1) return `${d}d`; const h = Math.floor((now - at) / 3_600_000); return h >= 1 ? `${h}h` : '' }
  const ago = (at: number) => { const t = span(at); return t ? `${t} ago` : 'just now' }
  const sent = c.sentAt.getTime(), seen = c.viewedAt?.getTime() ?? null
  return {
    full: `Sent ${ago(sent)} · ${seen ? `opened ${ago(seen)}` : 'not opened'}`,
    short: seen ? `Opened ${ago(seen)}` : span(sent) ? `Not opened in ${span(sent)}` : 'Not opened yet',
  }
}

/** "Saved just now" / "Saved 2 mins ago" — the quote editor's stamp (quote-editor.tsx). */
export function savedLabel(updatedAt: number, now: number): string {
  const s = Math.max(0, Math.round((now - updatedAt) / 1000))
  if (s < 45) return 'Saved just now'
  const m = Math.round(s / 60)
  if (m < 60) return `Saved ${m} ${m === 1 ? 'min' : 'mins'} ago`
  const h = Math.round(m / 60)
  if (h < 24) return `Saved ${h} ${h === 1 ? 'hour' : 'hours'} ago`
  const d = new Date(updatedAt)
  return `Saved ${d.getDate()} ${d.toLocaleString('en-SG', { month: 'short' })} ’${String(d.getFullYear()).slice(2)}`
}

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
export const contractLink = (c: { id: string; bundleId: string | null; status: string }) => (c.bundleId && c.status === 'Sent to Client' ? bundleSigningLink(c.bundleId) : signingLink(c.id))
