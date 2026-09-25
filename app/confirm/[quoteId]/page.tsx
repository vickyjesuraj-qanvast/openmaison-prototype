import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchQuotePreview } from '@/lib/templates/queries'
import { ConfirmPage } from '@/components/quotes/confirm/confirm-page'
import { fetchConfirmExtras } from '@/lib/quotes/confirm-data'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ quoteId: string }> }): Promise<Metadata> {
  const { quoteId } = await params
  const data = await fetchQuotePreview(quoteId)
  return { title: data ? `Confirm · ${data.quote.number}` : 'Confirm' }
}

/** (REG-587) The confirmation link's page: the client reads the quote as the studio prints it and confirms it — the T&Cs and the signature follow. */
export default async function ConfirmQuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const [data, extras] = await Promise.all([fetchQuotePreview(quoteId), fetchConfirmExtras(quoteId)])
  if (!data || !extras) notFound()
  return <ConfirmPage data={data} extras={extras} />
}
