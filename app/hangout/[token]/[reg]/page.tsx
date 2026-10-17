import type { Metadata } from 'next'
import { fetchHangoutOwn } from '@/lib/hangouts/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { linkMetadata } from '@/lib/link-cards/meta'
import { LinkGone } from '@/components/contracts/sign/link-gone'
import { HangoutOwnView } from '@/components/hangouts/public/hangout-public'
import { HangoutPublicGhost } from '@/components/hangouts/public/hangout-public-ghost'
import { PageReveal } from '@/components/shell/page-reveal'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string; reg: string }> }): Promise<Metadata> {
  const { token, reg } = await params
  return linkMetadata('hangout', `${token}.${reg}`, `/hangout/${token}/${reg}`)
}

/** (pending modules S27 — public:hangouts) A homeowner's own page on the studio's Hangout page — the booking's token is the permission. */
export default async function HangoutOwnRoute({ params, searchParams }: { params: Promise<{ token: string; reg: string }>; searchParams: Promise<{ again?: string }> }) {
  const [{ token, reg }, sp] = await Promise.all([params, searchParams])
  const data = await fetchHangoutOwn(token, reg)
  if (data.state === 'gone') {
    const brand = await fetchBrand()
    return <LinkGone studio={data.studio.name} brand={brand.kit} />
  }
  return <PageReveal skeleton={<HangoutPublicGhost own />}><HangoutOwnView data={data} again={sp.again === '1'} /></PageReveal>
}
