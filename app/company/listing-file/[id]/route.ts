import { sendStored } from '@/lib/leads/file-store'
import { listingFileData } from '@/lib/qanvast-listing/queries'
import { signedOutResponse } from '@/lib/auth/session'
import { refusesPath } from '@/lib/leads/visibility'

/** (pending modules S37) A proof file of the studio's Qanvast application, on the studio's own page (Company › Profile) — behind sign-in. A PDF
    or a picture opens in place; anything else could never have been kept (addListingProof takes only those). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { id } = await params
  if (await refusesPath('/company/profile')) return new Response('Not found', { status: 404 })   // (S44Z) Company › Profile's proof answers as its page does — before the file is read
  const f = await listingFileData(id)
  return (f ? sendStored(f.data, req, { name: f.name, cache: 'private, max-age=300' }) : null) ?? new Response('Not found', { status: 404 })
}
