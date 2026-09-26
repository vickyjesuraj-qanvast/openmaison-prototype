import type { Metadata } from 'next'
import { fetchBrand, fetchQuotePreview } from '@/lib/templates/queries'
import { ConfirmPage } from '@/components/quotes/confirm/confirm-page'
import { fetchConfirmExtras } from '@/lib/quotes/confirm-data'
import { LinkGone } from '@/components/contracts/sign/link-gone'

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
  if (!data || !extras) {
    /* (F111) a deleted quote, or a link that was never made: the studio's letterhead and the house notice, as the signing links — never a 404 */
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} />
  }
  return <ConfirmPage data={data} extras={extras} />
}
