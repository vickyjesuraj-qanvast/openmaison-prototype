import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchBundleSigning } from '@/lib/contracts/queries'
import { BundleSigningPage } from '@/components/contracts/sign/bundle-signing-page'
import { stampBundleViewed } from '@/lib/contracts/status'
import { fetchBrand } from '@/lib/templates/queries'
import { LinkGone } from '@/components/contracts/sign/link-gone'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await fetchBundleSigning(id)
  return { title: data ? `Sign · ${data.documents.length} ${data.documents.length === 1 ? 'document' : 'documents'}` : 'Sign' }   // (sweep S2 #26)
}

/** (REG-591) One link, several documents: the client reads each and signs once. */
export default async function SignBundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchBundleSigning(id)
  if (!data) {
    if (!/^[0-9a-f-]{8,64}$/i.test(id)) notFound()
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} />   /* (sweep S2 #14) */
  }
  if (data.state === 'open' && !data.bundle.viewedAt) await stampBundleViewed(id)   // (REG-633, parity Q-17)
  return <BundleSigningPage data={data} />
}
