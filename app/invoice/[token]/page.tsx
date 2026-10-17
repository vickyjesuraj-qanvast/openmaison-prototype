import type { Metadata } from 'next'
import { fetchPublicInvoice } from '@/lib/projects/payments-public'
import { fetchBrand } from '@/lib/templates/queries'
import { PublicDocPage } from '@/components/projects/money/public-doc-page'
import { LinkNotice } from '@/components/contracts/sign/link-notice'
import { linkMetadata } from '@/lib/link-cards/meta'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('invoice', token, `/invoice/${token}`)   // (pending modules S02) "Invoice … · {studio}" and the studio's card
}

/** (gaps build B, item 6) An invoice the client opens from its link without signing in — the token is the permission (lib/projects/payments-public.ts).
    A link that answers nothing says so in the signing link's words, never a bare 404. Kept working while the portal is paused (Q-40). */
export default async function PublicInvoiceRoute({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ print?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams])
  const d = await fetchPublicInvoice(token)
  if (!d) return <LinkNotice state="inactive" studio={(await fetchBrand()).details.name || 'the studio'} />
  return <PublicDocPage invoice={d} print={sp.print === '1'} />
}
