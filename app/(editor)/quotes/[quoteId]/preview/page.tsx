import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchQuotePreview } from '@/lib/templates/queries'
import { QuotePreview } from '@/components/quotes/preview/quote-preview'
import { readFrom } from '@/lib/nav'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ quoteId: string }> }): Promise<Metadata> {
  const { quoteId } = await params
  const data = await fetchQuotePreview(quoteId)
  return { title: data ? `${data.quote.number} · Preview` : 'Preview' }
}

/** Preview (REG-490): the quote through its template, as the client sees it; `?print=1` prints the same pages (Download as PDF · Print); `?version=n` opens a kept earlier version (REG-565). */
export default async function QuotePreviewPage({ params, searchParams }: { params: Promise<{ quoteId: string }>; searchParams: Promise<{ from?: string; print?: string; version?: string }> }) {
  const { quoteId } = await params
  const sp = await searchParams
  const version = sp.version && /^\d+$/.test(sp.version) ? Number(sp.version) : undefined   // (REG-565) a kept version, read-only
  const data = await fetchQuotePreview(quoteId, version)
  if (!data) notFound()
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, data.quote.leadId))) notFound()   /* (REG-625, parity §8.2 · E-135) the studio's preview follows Who sees leads; the client's /confirm link does not */
  /* (UX audit Q2) Preview's Send is the editor's: it needs the studio's approval rule and whether this member approves. */
  const [approval, canApprove] = await Promise.all([fetchQuoteApproval(), isApprover(viewer.id, viewer.role)])
  return <QuotePreview data={data} from={readFrom(sp.from)} print={sp.print === '1'} send={{ approval, canApprove }} />
}
