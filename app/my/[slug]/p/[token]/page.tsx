import { redirect } from 'next/navigation'
import { oldPortalTokenTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's one-tap portal link (`/my/<slug>/p/<token>`): 2.0's portal — the client signs in with their phone, then lands on Home. */
export default async function OldPortalTokenLink({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params
  redirect(await oldPortalTokenTarget(slug, token))
}
