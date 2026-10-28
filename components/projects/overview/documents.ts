import { displayDate } from '@/lib/format'
import { quoteStatusLabel } from '@/lib/quotes/status-words'   // (the calm UI build 2026-10-27, T-01 · 4-04 — B4's request) a status on screen reads its display word
import { contractStatusLabel } from '@/lib/contracts/status-words'
import type { ProjectInfoDocument } from '@/components/leads/detail/info-column'
import type { ProjectDetail } from '@/lib/projects/queries'

/**
 * (simplify S-01, P1 §4) Key documents leave the Overview: the signed quote and the contract become the info column's Project info rows (the
 * ⋮ keeps its *Open the signed quote · Open the contract*), each opening itself with the way back — the Won step's uploaded copy in Files when
 * no system quote is signed (fix-A, A-15), the signed copy in Files › Contract when no record is linked (gaps build, package A — 6) — and a
 * direct project's other quotes and contracts, whose client has no lead page (fix-A, A-02). The frame hands these to `InfoColumn`'s `project`.
 */
export function projectInfoDocuments(d: ProjectDetail, o: { from: string; fileHref: (fileId: string) => string }): ProjectInfoDocument[] {
  const back = encodeURIComponent(o.from)
  const quote: ProjectInfoDocument = d.quote ? { key: 'quote', label: 'Signed quote', value: d.quote.number, href: `/quotes/${d.quote.id}?from=${back}`, testId: 'doc-quote' }
    : d.quoteFile ? { key: 'quote', label: 'Signed quote', value: 'Uploaded', href: o.fileHref(d.quoteFile.id), testId: 'doc-quote-file' }
    : { key: 'quote', label: 'Signed quote', value: d.lead.direct ? 'Agreed outside a quote' : null }
  const contract: ProjectInfoDocument = d.contract ? { key: 'contract', label: 'Contract', value: d.contract.signedAt ? `Signed ${displayDate(d.contract.signedAt)}` : contractStatusLabel(d.contract.status), href: `/contracts/${d.contract.id}?from=${back}`, testId: 'doc-contract' }
    : d.contractFile ? { key: 'contract', label: 'Contract', value: 'Uploaded', href: o.fileHref(d.contractFile.id), testId: 'doc-contract-file' }
    : { key: 'contract', label: 'Contract', value: null }
  return [
    quote, contract,
    ...d.documents.map((x): ProjectInfoDocument => ({ key: `${x.kind}:${x.id}`, label: x.kind === 'quote' ? 'Quote' : 'Contract', value: `${x.caption} · ${x.kind === 'quote' ? quoteStatusLabel(x.status) : contractStatusLabel(x.status)}`,
      href: `/${x.kind === 'quote' ? 'quotes' : 'contracts'}/${x.id}?from=${back}`, testId: `doc-${x.kind}-other` })),
  ]
}

/** (Contracts on the move, C4 — P-11 · C-23) One row of the Overview's Documents card: the document's name, its date (or where it stands), and
    where it opens — none when the document is not on record. */
export type ProjectDocumentRow = { key: 'quote' | 'contract'; icon: string; name: string; when: string; href?: string; testId: string }

/**
 * (Contracts on the move, C4 — P-11 · C-23; his "please check and built accordingly" 2026-10-22) The Overview's **Documents** card on ≤1024: the
 * signed quote and the contract, each a row with its date — the same records and the same addresses as the info column's Project info rows
 * (`projectInfoDocuments`, which keeps them on the desk and inside View Client Info). Both rows always, so a missing contract is said, not
 * hidden ("None yet"); no document at all → no card (`[]`).
 */
export function projectDocumentRows(d: ProjectDetail, o: { from: string; fileHref: (fileId: string) => string }): ProjectDocumentRow[] {
  const back = encodeURIComponent(o.from)
  const quote: ProjectDocumentRow = d.quote
    ? { key: 'quote', icon: 'request_quote', name: `Quote ${d.quote.number}`, when: d.quote.signedAt ? `Signed ${displayDate(d.quote.signedAt)}` : quoteStatusLabel(d.quote.status), href: `/quotes/${d.quote.id}?from=${back}`, testId: 'project-doc-quote' }
    : d.quoteFile ? { key: 'quote', icon: 'request_quote', name: 'Signed quote', when: 'Uploaded copy, in Files', href: o.fileHref(d.quoteFile.id), testId: 'project-doc-quote' }
    : { key: 'quote', icon: 'request_quote', name: 'Signed quote', when: d.lead.direct ? 'Agreed outside a quote' : 'None yet', testId: 'project-doc-quote' }
  const c = d.contract
  const contract: ProjectDocumentRow = c
    ? { key: 'contract', icon: 'contract', name: c.title, when: c.signedAt ? `Signed ${displayDate(c.signedAt)}` : c.status === 'Sent to Client' ? (c.sentAt ? `Sent ${displayDate(c.sentAt)} · not signed yet` : 'Sent · not signed yet') : contractStatusLabel(c.status),
        href: `/contracts/${c.id}?from=${back}`, testId: 'project-doc-contract' }
    : d.contractFile ? { key: 'contract', icon: 'contract', name: 'Signed contract', when: 'Uploaded copy, in Files', href: o.fileHref(d.contractFile.id), testId: 'project-doc-contract' }
    : { key: 'contract', icon: 'contract', name: 'Contract', when: 'None yet', testId: 'project-doc-contract' }
  return quote.href || contract.href ? [quote, contract] : []
}
