import type { Metadata } from 'next'
import { fetchJoin } from '@/lib/company/invitations-server'
import { fetchBrand } from '@/lib/templates/queries'
import { shortStudioName } from '@/lib/settings/types'
import { linkMetadata } from '@/lib/link-cards/meta'
import { JoinPage } from '@/components/company/join/join-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('join', token, `/join/${token}`)
}

/**
 * (pending modules S09 — 1.0's `/api/invitations/[token]` GET and its accept) An invitation's own page: the token is the permission. It names
 * the studio, who invited them and as what; Join sends a code to their mobile (or email) and, once it is typed, brings them in and signs them
 * in (pending modules S30). An expired, cancelled or unknown link answers in the studio's name, never a 404.
 */
export default async function JoinRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const view = await fetchJoin(token)
  if (view) return <JoinPage view={view} token={token} />
  const brand = await fetchBrand()
  return <JoinPage view={null} token={token} studio={shortStudioName(brand.details.name || 'Your studio')} logo={brand.kit.logo ?? null} />
}
