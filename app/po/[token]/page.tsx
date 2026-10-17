import type { Metadata } from 'next'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { purchaseOrders } from '@/lib/db/schema'
import { fetchPoByToken } from '@/lib/finance/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { isShareToken } from '@/lib/projects/invoices-token'
import { LinkNotice } from '@/components/contracts/sign/link-notice'
import { VendorLinkPage } from '@/components/finance/vendor-link-page'
import { linkMetadata } from '@/lib/link-cards/meta'
import { fetchedForPreview } from '@/lib/link-cards/origin'
import { isStudioVisit } from '@/lib/auth/studio-visit'   // (S42F — B-02's sibling)

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('po', token, `/po/${token}`)   // (pending modules S02) "Purchase order … · {studio}" and the studio's card
}

/** (gaps build F1 — F1-Q9) A PO the vendor opens from WhatsApp without signing in — the token is the permission; opening it stamps Viewed once. A
    link that answers nothing (a Draft, a removed PO) says so in the signing link's words, never a bare 404. */
export default async function VendorPoRoute({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ print?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams])
  const r = isShareToken(token) ? await fetchPoByToken(token) : null
  if (!r) return <LinkNotice state="inactive" studio={(await fetchBrand()).details.name || 'the studio'} />
  /* (pending modules S02) Viewed is the vendor's — never WhatsApp drawing the card on the studio's phone as the link is pasted · (S42F, B-02's
     sibling) nor the studio checking its own link in its own browser */
  if (!r.doc.po.vendorViewedAt && r.state === 'open' && !(await fetchedForPreview()) && !(await isStudioVisit())) await db.update(purchaseOrders).set({ vendorViewedAt: new Date() }).where(and(eq(purchaseOrders.vendorToken, token), isNull(purchaseOrders.vendorViewedAt)))
  return <VendorLinkPage token={token} d={r.doc} state={r.state} print={sp.print === '1'} />
}
