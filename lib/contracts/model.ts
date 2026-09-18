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
