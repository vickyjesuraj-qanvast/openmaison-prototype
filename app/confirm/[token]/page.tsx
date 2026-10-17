import type { Metadata } from 'next'
import { fetchBrand, fetchQuotePreview } from '@/lib/templates/queries'
import { ConfirmPage } from '@/components/quotes/confirm/confirm-page'
import { fetchConfirmExtras } from '@/lib/quotes/confirm-data'
import { clientQuoteOf, quoteByConfirmKey, withoutContent } from '@/lib/quotes/client-quote'
import { confirmPath } from '@/lib/quotes/confirm'
import { LinkGone } from '@/components/contracts/sign/link-gone'
import { linkMetadata } from '@/lib/link-cards/meta'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('confirm', token, confirmPath(token))   // (Projects round 5) a variation order is "Approve · …" · (pending modules S02) the studio's card
}

/**
 * (REG-587) The confirmation link's page: the client reads the quote as the studio prints it and confirms it — the T&Cs and the signature follow.
 * (pending modules S04) The address carries the link's token, never the quote's id (a quote made before S04 keeps its id as its token); the page
 * acts through that token, and the browser gets the quote as the print reads it (`clientQuoteOf`) — no cost, mark-up, rebate, vendor or record
 * ids. A link opened before the studio sent the quote carries none of its content: the card says "Not ready yet".
 */
export default async function ConfirmQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const hit = await quoteByConfirmKey(token)
  const [data, extras] = hit ? await Promise.all([fetchQuotePreview(hit.id), fetchConfirmExtras(hit.id)]) : [null, null]
  if (!data || !extras) {
    /* (F111) a deleted quote, or a link that was never made: the studio's letterhead and the house notice, as the signing links — never a 404 */
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} />
  }
  const client = clientQuoteOf(data)
  const shows = extras.open || data.quote.status === 'Confirmed' || data.quote.status === 'Signed' || !!data.quote.confirmedAt
  /* (S04) not sent yet: nothing of the draft reaches the browser — the stage stays empty and the card says so (sweep S1's rule, now on the wire too) */
  const safe = shows ? client : { ...client, data: withoutContent(client.data) }   // (S44F — NB-03) its sums too
  return <ConfirmPage token={token} data={safe} extras={shows ? extras : { ...extras, optional: [], files: [] }} />
}
