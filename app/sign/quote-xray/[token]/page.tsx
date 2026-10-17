import type { Metadata } from 'next'
import { fetchBrand } from '@/lib/templates/queries'
import { LinkGone } from '@/components/contracts/sign/link-gone'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const brand = await fetchBrand()
  return { title: { absolute: brand.details.name }, robots: { index: false, follow: false } }
}

/** (pending modules S02 — D-11) 1.0's Quote X-Ray client link: 2.0 sends the comparison as a WhatsApp message, never a link (X-Ray audit
    Q-24), so an old one says it no longer works — in the studio's name, never a bare 404. */
export default async function OldXrayLink() {
  const brand = await fetchBrand()
  return <LinkGone studio={brand.details.name} brand={brand.kit} />
}
