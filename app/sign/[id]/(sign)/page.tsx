import type { Metadata } from 'next'
import { fetchSigning } from '@/lib/contracts/queries'
import { SigningPage } from '@/components/contracts/sign/signing-page'
import { stampViewed } from '@/lib/contracts/status'
import { fetchBrand } from '@/lib/templates/queries'
import { LinkGone } from '@/components/contracts/sign/link-gone'
import { fetchCaseTrust } from '@/lib/contracts/casetrust-queries'
import { linkMetadata } from '@/lib/link-cards/meta'
import { fetchedForPreview } from '@/lib/link-cards/origin'
import { isStudioVisit } from '@/lib/auth/studio-visit'   // (S42 B-02)
import { isStandInProvider } from '@/lib/auth/provider'   // (S42 B-03)
import { redirect } from 'next/navigation'
import { bundleIdForToken } from '@/lib/contracts/link-server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return linkMetadata('sign', id, `/sign/${id}`)   // (pending modules S02) the studio's card in the chat, the studio's name in the tab
}

/** The signing link's page (REG-534): what the client opens from WhatsApp — review, one-time code, sign. (pending modules S03) `[id]` is the
 *  link's token: a contract's own, or 1.0's request token for a set of documents a port brought over, which lands on the set's page. */
export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await fetchSigning(id)
  if (!data) {
    const bundle = await bundleIdForToken(id); if (bundle) redirect(`/sign/bundle/${bundle}`)
    const brand = await fetchBrand()
    return <LinkGone studio={brand.details.name} brand={brand.kit} />   /* (sweep S2 #14 · F111) deleted for good, or never made: the link says so, never a 404 */
  }
  /* (REG-633, parity Q-17) the client opened it — (pending modules S02) not WhatsApp drawing the card on the sender's phone as the link is pasted */
  if (data.state === 'open' && !data.contract.viewedAt && !(await fetchedForPreview()) && !(await isStudioVisit())) await stampViewed(data.contract.id)
  return <SigningPage data={data} caseTrust={await fetchCaseTrust()} codeDemo={isStandInProvider()} />   // (S42 B-03) the code step says no text goes while the stand-in answers   // (gaps build D, item 6)
}
