import type { Metadata } from 'next'
import { fetchBrand } from '@/lib/templates/queries'
import { fetchQuoteView } from '@/lib/quotes/view-link-queries'
import { linkMetadata } from '@/lib/link-cards/meta'
import { QuoteViewPage } from '@/components/quotes/view/quote-view-page'
import { LinkGone } from '@/components/contracts/sign/link-gone'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('quote', token, `/quote/${token}`)
}

/**
 * (pending modules S02 — 1.0's `/quote-preview/[token]` and `/quote/[token]`) The quote's view-only link: the token is the permission. A
 * stopped link, one never made, an archived or deleted quote, or a lead returned or deleted all answer with the studio's letterhead and the
 * house notice — never a 404. 1.0's `/quote/<token>` lands here as it is (a port keeps 1.0's token); `/quote-preview/<token>` redirects here.
 */
export default async function QuoteViewRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await fetchQuoteView(token)
  if (!data) {
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} phone={brand.details.phone} />   /* (K4 — A-23) the way to ask for a new link */
  }
  return <QuoteViewPage data={data} />
}
