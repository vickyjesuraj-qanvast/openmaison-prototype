import type { Metadata } from 'next'
import { fetchSigning } from '@/lib/contracts/queries'
import { fetchBrand, fetchQuotePreview } from '@/lib/templates/queries'
import { SignQuoteView } from '@/components/contracts/sign/sign-quote-view'
import { LinkGone } from '@/components/contracts/sign/link-gone'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await fetchSigning(id)
  return { title: data?.quote ? `Quotation · ${data.quote.number}` : 'Quotation' }
}

/**
 * (REG-633, contracts parity Q-20) The quote an agreement signs, read-only, from the signing page — 1.0 always put the quote in front
 * of the client at signing (B-60). Reachable only through a contract link that is out for signature or signed; its key is the contract's.
 */
export default async function SignQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchSigning(id)
  if (!data) {
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} />   /* (F111, wave E) a contract deleted for good, or never made: the house notice, as /sign/[id] says it — never a bare 404 */
  }
  const quoteId = data.state === 'open' || data.state === 'signed' ? data.contract.fromQuoteId : null
  const preview = quoteId ? await fetchQuotePreview(quoteId) : null
  return <SignQuoteView contractId={id} issuer={data.letterhead.name} logo={data.letterhead.logo ?? data.brand.logo} data={preview} state={data.state} />
}
