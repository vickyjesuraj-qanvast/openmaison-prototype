import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchPublicProfile } from '@/lib/portfolio/queries'
import { PublicProfileView } from '@/components/portfolio/public-profile-view'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Public profile' }

/** (pending modules S27 — api:designer-portfolio-profiles) A member's Public profile — their card and their work, as clients read them. */
export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ memberId: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ memberId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/company/members/${memberId}/profile`)) return <AccessGate section="Members" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const data = await fetchPublicProfile(memberId)
  if (!data) notFound()
  return <PublicProfileView data={data} from={readFrom(sp.from)} />
}
