import type { Metadata } from 'next'
import { fetchPublicReceipt } from '@/lib/projects/payments-public'
import { fetchBrand } from '@/lib/templates/queries'
import { PublicDocPage } from '@/components/projects/money/public-doc-page'
import { LinkNotice } from '@/components/contracts/sign/link-notice'
import { linkMetadata } from '@/lib/link-cards/meta'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('receipt', token, `/receipt/${token}`)   // (pending modules S02) "Receipt … · {studio}" and the studio's card
}

/** (gaps build B, item 6 — 1.0 G-495) A receipt the client opens from its link without signing in; a reversed one says Reversed. */
export default async function PublicReceiptRoute({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ print?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams])
  const d = await fetchPublicReceipt(token)
  if (!d) return <LinkNotice state="inactive" studio={(await fetchBrand()).details.name || 'the studio'} />
  return <PublicDocPage receipt={d} print={sp.print === '1'} />
}
