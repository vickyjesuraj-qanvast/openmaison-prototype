import type { Metadata } from 'next'
import { fetchSigning } from '@/lib/contracts/queries'
import { fetchBrand, fetchQuotePreview } from '@/lib/templates/queries'
import { SignQuoteView } from '@/components/contracts/sign/sign-quote-view'
import { LinkGone } from '@/components/contracts/sign/link-gone'
import { linkMetadata } from '@/lib/link-cards/meta'
import { linkCard } from '@/lib/link-cards/queries'
import { clientQuoteOf } from '@/lib/quotes/client-quote'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const [data, card] = await Promise.all([fetchSigning(id), linkCard('sign', id)])
  /* (pending modules S02) the agreement's card; the tab names the quote and the studio */
  return linkMetadata('sign', id, `/sign/${id}/quote`, { card, pageTitle: data?.quote ? `Quotation · ${data.quote.number} · ${card.studio}` : card.pageTitle })
}

/**
 * (REG-633, contracts parity Q-20) The quote an agreement signs, read-only, from the signing page — 1.0 always put the quote in front
 * of the client at signing (B-60). Reachable only through a contract link that is out for signature or signed; (pending modules S03) its key
 * is the link's token, as the agreement's. (S04) The browser gets the quote as the print reads it (`clientQuoteOf`) — no cost, mark-up,
 * rebate, vendor or record ids.
 */
export default async function SignQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchSigning(id)
  if (!data) {
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} phone={brand.details.phone} />   /* (F111, wave E) a contract deleted for good, or never made: the house notice, as /sign/[id] says it — never a bare 404 · (C3 — A-25) */
  }
  const quoteId = data.state === 'open' || data.state === 'signed' ? data.contract.fromQuoteId : null
  const preview = quoteId ? await fetchQuotePreview(quoteId) : null
  return <SignQuoteView token={id} issuer={data.letterhead.name} logo={data.letterhead.logo ?? data.brand.logo} data={preview ? clientQuoteOf(preview) : null} state={data.state} phone={data.studio.phone} />
}
