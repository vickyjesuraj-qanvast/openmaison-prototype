import { displayDate } from '@/lib/format'
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
  const contract: ProjectInfoDocument = d.contract ? { key: 'contract', label: 'Contract', value: d.contract.signedAt ? `Signed ${displayDate(d.contract.signedAt)}` : d.contract.status, href: `/contracts/${d.contract.id}?from=${back}`, testId: 'doc-contract' }
    : d.contractFile ? { key: 'contract', label: 'Contract', value: 'Uploaded', href: o.fileHref(d.contractFile.id), testId: 'doc-contract-file' }
    : { key: 'contract', label: 'Contract', value: null }
  return [
    quote, contract,
    ...d.documents.map((x): ProjectInfoDocument => ({ key: `${x.kind}:${x.id}`, label: x.kind === 'quote' ? 'Quote' : 'Contract', value: `${x.caption} · ${x.status}`,
      href: `/${x.kind === 'quote' ? 'quotes' : 'contracts'}/${x.id}?from=${back}`, testId: `doc-${x.kind}-other` })),
  ]
}
