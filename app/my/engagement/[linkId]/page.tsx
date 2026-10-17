import { redirect } from 'next/navigation'
import { oldPortalTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's lead-stage page (`/my/engagement/<id>`): 2.0's portal Home carries it — Before work starts (sign-in first). */
export default async function OldPortalEngagement() {
  redirect(await oldPortalTarget())
}
