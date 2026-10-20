import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { fetchBrand } from '@/lib/templates/queries'
import { LinkGone } from '@/components/contracts/sign/link-gone'
import { bundleIdForToken, contractIdForToken } from '@/lib/contracts/link-server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const brand = await fetchBrand()
  return { title: { absolute: brand.details.name }, robots: { index: false, follow: false } }
}

/**
 * (S46D — D2, his "fix everything" 2026-10-19; finding D2 · raw P-1; FROM-1.0-TO-2.0.md §9 #3) 1.0's link for signing a file of a lead
 * (qanvast only — `lead_document_signature_requests`, `/sign/document/<token>`), already in clients' WhatsApp chats. The port carries each
 * request's token into its contract's `sign_token` (design-source/context/parity/08-contracts-migration-map-2026-09-25.md §1), so a link
 * whose contract (or set of documents) is here lands on 2.0's signing page at `/sign/<token>` — which answers it as every signing link: open,
 * signed, not sent, expired or no longer active. A token nothing carries says the link no longer works, in the studio's name — the signing
 * pages' own notice (`/sign/quote-xray/<token>`'s), never a bare 404. The address is a client's (lib/auth/paths.ts: `/sign` is public).
 */
export default async function OldDocumentSigningLink({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if ((await contractIdForToken(token)) || (await bundleIdForToken(token))) redirect(`/sign/${encodeURIComponent(token)}`)
  const brand = await fetchBrand()
  return <LinkGone studio={brand.details.name} brand={brand.kit} />
}
