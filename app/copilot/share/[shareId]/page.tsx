import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { fetchBrand } from '@/lib/templates/queries'
import { oldMeetingShareTarget } from '@/lib/links/old-links'
import { LinkGone } from '@/components/contracts/sign/link-gone'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const brand = await fetchBrand()
  return { title: { absolute: brand.details.name }, robots: { index: false, follow: false } }
}

/** (pending modules S23 — D-11's rule for 1.0's old links) 1.0's meeting share link (`/copilot/share/<shareId>`): the meeting's client link when
    2.0 holds that id as a meeting's token (a port carries it into `meetings.client_token`); else the studio's notice that the link no longer
    works — 1.0's share links lasted 24 hours, so a real one has long ended. Never a bare 404. */
export default async function OldMeetingShare({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const target = await oldMeetingShareTarget(shareId)
  if (target) redirect(target)
  const brand = await fetchBrand()
  return <LinkGone studio={brand.details.name} brand={brand.kit} />
}
