import type { Metadata } from 'next'
import { fetchHangoutPublic } from '@/lib/hangouts/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { linkMetadata } from '@/lib/link-cards/meta'
import { LinkGone } from '@/components/contracts/sign/link-gone'
import { HangoutPublic } from '@/components/hangouts/public/hangout-public'
import { HangoutPublicGhost } from '@/components/hangouts/public/hangout-public-ghost'
import { PageReveal } from '@/components/shell/page-reveal'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('hangout', token, `/hangout/${token}`)   // the studio's card — never the platform's
}

/**
 * (pending modules S27 — public:hangouts) The studio's page for a Qanvast Hangout: the token is the studio's own page (made when Qanvast
 * confirmed its place); a token that names no page the studio still has — withdrawn, cancelled by Qanvast, never made — is the house notice in
 * the studio's name, never a 404.
 */
export default async function HangoutPublicRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await fetchHangoutPublic(token)
  if (data.state === 'gone') {
    const brand = await fetchBrand()
    return <LinkGone studio={data.studio.name} brand={brand.kit} />
  }
  return <PageReveal skeleton={<HangoutPublicGhost />}><HangoutPublic data={data} /></PageReveal>
}
