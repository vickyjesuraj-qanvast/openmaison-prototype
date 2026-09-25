import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchSigning } from '@/lib/contracts/queries'
import { SigningPage } from '@/components/contracts/sign/signing-page'
import { stampViewed } from '@/lib/contracts/status'
import { fetchBrand } from '@/lib/templates/queries'
import { LinkGone } from '@/components/contracts/sign/link-gone'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await fetchSigning(id)
  return { title: data ? `Sign · ${data.contract.title}` : 'Sign' }
}

/** The signing link's page (REG-534): what the client opens from WhatsApp — review, one-time code, sign. */
export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchSigning(id)
  if (!data) {
    if (!/^[0-9a-f-]{8,64}$/i.test(id)) notFound()   // not a link the app ever made
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} />   /* (sweep S2 #14) deleted for good: the link says so, not a 404 */
  }
  if (data.state === 'open' && !data.contract.viewedAt) await stampViewed(id)   // (REG-633, parity Q-17) the client opened it
  return <SigningPage data={data} />
}
