import { redirect } from 'next/navigation'
import { oldPortalTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's old project portal link (`/pay/<token>`): the studio's client portal, which asks the client to sign in first. */
export default async function OldPayPortal() {
  redirect(await oldPortalTarget())
}
