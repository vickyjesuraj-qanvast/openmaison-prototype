import { redirect } from 'next/navigation'
import { portalPath } from '@/lib/portal/model'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's `/my/<slug>/team`: 2.0's About, which holds Our team (an old address redirects there in turn). */
export default async function OldPortalTeam({ params }: { params: Promise<{ slug: string }> }) {
  redirect(portalPath((await params).slug, 'about'))
}
