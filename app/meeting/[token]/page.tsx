import type { Metadata } from 'next'
import { fetchClientMeeting } from '@/lib/meetings/client'
import { fetchBrand } from '@/lib/templates/queries'
import { linkMetadata } from '@/lib/link-cards/meta'
import { requestOrigin } from '@/lib/link-cards/origin'
import { LinkGone } from '@/components/contracts/sign/link-gone'
import { MeetingLinkGhost, MeetingLinkPage } from '@/components/meetings/client/meeting-link-page'
import { PageReveal } from '@/components/shell/page-reveal'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('meeting', token, `/meeting/${token}`)   // the studio's card — "Meeting invitation" / "Meeting notes", never the platform's
}

/**
 * (pending modules S23 — Meetings and the Meeting Co-Pilot) The client's meeting link: the token is the permission. The invitation before the
 * meeting, the notes after it once the studio shares them, a thank-you when it doesn't, the cancelled notice — and, for a link that names no
 * meeting (deleted, its lead returned or deleted, past its 30 days, never made), the studio's letterhead and the house notice, never a 404.
 * The render never stamps Viewed: the page's first browser ask does (a chat app fetching the link for its card runs no script).
 */
export default async function MeetingLinkRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const origin = await requestOrigin()
  const data = await fetchClientMeeting(token, { origin: origin.origin })
  if (data.state === 'closed') {
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} />
  }
  return <PageReveal skeleton={<MeetingLinkGhost data={data} />}><MeetingLinkPage data={data} /></PageReveal>
}
