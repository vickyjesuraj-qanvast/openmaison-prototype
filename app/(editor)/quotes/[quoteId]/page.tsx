import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchQuoteEditor } from '@/lib/quotes/editor'
import { QuoteEditor } from '@/components/quotes/editor/quote-editor'
import { readFrom } from '@/lib/nav'

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
export default async function QuoteEditorPage({ params, searchParams }: { params: Promise<{ quoteId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { quoteId } = await params
  const sp = await searchParams
  const data = await fetchQuoteEditor(quoteId)
  if (!data) notFound()
  return <QuoteEditor data={data} from={readFrom(sp.from)} />   /* (REG-465) close returns where the editor was opened from */
}
