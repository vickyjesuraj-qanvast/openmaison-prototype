import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { notFound } from 'next/navigation'
import { fetchQuotePreview } from '@/lib/templates/queries'
import { QuotePreview } from '@/components/quotes/preview/quote-preview'
import { readFrom } from '@/lib/nav'
import { canOpenLead, fetchViewer, refusesPath } from '@/lib/leads/visibility'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import { opensWorkspace } from '@/lib/settings/roles'
import { docDataFor, sightOf } from '@/lib/quotes/cost-sight'   // (pending modules S41b-1)

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ quoteId: string }> }): Promise<Metadata> {
  const { quoteId } = await params
  if (await refusesPath(`/quotes/${quoteId}/preview`)) return { title: 'Quotes' }   // (S44O — C6) no record's name in a tab that is not theirs
  const data = await fetchQuotePreview(quoteId)
  return { title: data ? `${data.quote.number} · Preview` : 'Preview' }
}

/** Preview (REG-490): the quote through its template, as the client sees it; `?print=1` prints the same pages (Download as PDF · Print); `?version=n` opens a kept earlier version (REG-565);
    (S44F — NB-02 (c)) `?against=m` compares the version shown with an earlier kept one; (S44I, row 352) `?panel=client` opens with What your client sees;
    (Quotes on the move, K3 — P-05) `?paper=1` opens a phone on the paper viewer — the Quote screen's "As printed" lands here. */
export default async function QuotePreviewPage({ params, searchParams }: { params: Promise<{ quoteId: string }>; searchParams: Promise<{ from?: string; print?: string; version?: string; against?: string; panel?: string; paper?: string }> }) {
  const { quoteId } = await params
  if (await refusesPath(`/quotes/${quoteId}/preview`)) return <AccessGate section="Quotes" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const sp = await searchParams
  const version = sp.version && /^\d+$/.test(sp.version) ? Number(sp.version) : undefined   // (REG-565) a kept version, read-only
  const against = sp.against && /^\d+$/.test(sp.against) ? Number(sp.against) : undefined   // (S44F — NB-02 (c))
  const data = await fetchQuotePreview(quoteId, version, against)
  if (!data) notFound()
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, data.quote.leadId))) notFound()   /* (REG-625, parity §8.2 · E-135) the studio's preview follows Who sees leads; the client's /confirm link does not */
  /* (UX audit Q2) Preview's Send is the editor's: it needs the studio's approval rule and whether this member approves. */
  const [approval, canApprove] = await Promise.all([fetchQuoteApproval(), isApprover(viewer.id, viewer.role)])
  /* (pending modules S06) Accounting reads a quote or a variation order a Money row links to — read-only, Back to that Money */
  /* (pending modules S41b-1) the lines as this member may see them — no cost, mark-up or rebate for whoever doesn't see costs — and no Internal copy */
  const sight = sightOf(viewer)
  return <QuotePreview data={{ ...data, data: docDataFor(data.data, sight) }} costs={sight.costs} from={readFrom(sp.from)} print={sp.print === '1'} openPanel={sp.panel === 'client'} paper={sp.paper === '1'} send={{ approval, canApprove }} readOnly={!opensWorkspace(viewer.role)} />
}
