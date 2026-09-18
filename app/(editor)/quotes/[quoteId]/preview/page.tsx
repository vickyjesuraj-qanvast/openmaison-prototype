import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchQuotePreview } from '@/lib/templates/queries'
import { QuotePreview } from '@/components/quotes/preview/quote-preview'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ quoteId: string }> }): Promise<Metadata> {
  const { quoteId } = await params
  const data = await fetchQuotePreview(quoteId)
  return { title: data ? `${data.quote.number} · Preview` : 'Preview' }
}

/** Preview (REG-490): the quote through its template, as the client sees it; `?print=1` prints the same pages (Download as PDF · Print). */
export default async function QuotePreviewPage({ params, searchParams }: { params: Promise<{ quoteId: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const { quoteId } = await params
  const sp = await searchParams
  const data = await fetchQuotePreview(quoteId)
  if (!data) notFound()
  return <QuotePreview data={data} from={readFrom(sp.from)} print={sp.print === '1'} />
}
