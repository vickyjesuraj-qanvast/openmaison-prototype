import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchQuoteEditor } from '@/lib/quotes/editor'
import { QuoteEditor } from '@/components/quotes/editor/quote-editor'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ quoteId: string }> }): Promise<Metadata> {
  const { quoteId } = await params
  const data = await fetchQuoteEditor(quoteId)
  return { title: data ? `${data.quote.number} · ${data.lead.name}` : 'Quote' }
}

/**
 * Quote editor (Figma 1271:40301): a full-page surface over the page the user came from — no rail (app/quotes/layout.tsx).
 * A missing or deleted quote is a 404. Spec: design-source/context/quote-editor/00-build-plan.md.
 */
export default async function QuoteEditorPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const data = await fetchQuoteEditor(quoteId)
  if (!data) notFound()
  return <QuoteEditor data={data} />
}
