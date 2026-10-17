import { redirect } from 'next/navigation'
import { oldPortalSectionTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's `/my/<slug>/projects/<id>`: the portal's Home, where each of the client's homes is (sign-in first).
    (pending modules S41b-2) Its `?tab=` lands on that section of the portal. */
export default async function OldPortalStudioProject({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string | string[]; issue?: string | string[] }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  redirect(await oldPortalSectionTarget(slug, sp))
}
