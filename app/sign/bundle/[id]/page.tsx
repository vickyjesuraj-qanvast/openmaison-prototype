import type { Metadata } from 'next'
import { fetchBundleSigning } from '@/lib/contracts/queries'
import { BundleSigningPage } from '@/components/contracts/sign/bundle-signing-page'
import { fetchCaseTrust } from '@/lib/contracts/casetrust-queries'
import { stampBundleViewed } from '@/lib/contracts/status'
import { fetchBrand } from '@/lib/templates/queries'
import { LinkGone } from '@/components/contracts/sign/link-gone'
import { linkMetadata } from '@/lib/link-cards/meta'
import { fetchedForPreview } from '@/lib/link-cards/origin'
import { isStudioVisit } from '@/lib/auth/studio-visit'   // (S42 B-02)
import { isStandInProvider } from '@/lib/auth/provider'   // (S42 B-03)

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return linkMetadata('bundle', id, `/sign/bundle/${id}`)   // (sweep S2 #26 → pending modules S02) "Sign · n documents · {studio}" and the studio's card
}

/** (REG-591) One link, several documents: the client reads each and signs once. */
export default async function SignBundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchBundleSigning(id)
  if (!data) {
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} />   /* (sweep S2 #14 · F111) deleted for good, or never made: never a 404 */
  }
  if (data.state === 'open' && !data.bundle.viewedAt && !(await fetchedForPreview()) && !(await isStudioVisit())) await stampBundleViewed(id)   // (REG-633, parity Q-17) · (S02) a person, not a chat's preview
  return <BundleSigningPage data={data} caseTrust={await fetchCaseTrust()} codeDemo={isStandInProvider()} />   // (S42 B-03)   // (gaps build D, item 6)
}
