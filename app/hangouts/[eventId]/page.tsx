import { redirect } from 'next/navigation'
import { pageForFeedEvent } from '@/lib/hangouts/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { shortStudioName } from '@/lib/settings/types'
import { LinkGone } from '@/components/contracts/sign/link-gone'

export const dynamic = 'force-dynamic'

/**
 * (pending modules S27 — S02's rule for 1.0's old links, D-11) 1.0's `/hangouts/<eventId>` — Qanvast's homeowner page for an event — lands on
 * the studio's own page for that event when the studio takes part (the event's Qanvast id is its `feed_ref`); else the house notice in the
 * studio's name. 1.0's SMS sign-in on that page is the developers' (S30).
 */
export default async function OldHangoutLink({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const to = eventId && eventId.length <= 80 ? await pageForFeedEvent(eventId) : null
  if (to) redirect(to)
  const brand = await fetchBrand()
  return <LinkGone studio={shortStudioName(brand.details.name || 'Your studio')} brand={brand.kit} />
}
