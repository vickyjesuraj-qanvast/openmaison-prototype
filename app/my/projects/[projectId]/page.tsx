import { redirect } from 'next/navigation'
import { oldPortalSectionTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's `/my/projects/<id>`: the client's homes are on the portal's Home (sign-in first). (pending modules S41b-2)
    Its `?tab=` — `floor-plan` in 1.0's floor-plan notices, `finance`, `issues`… — lands on that section of the portal. */
export default async function OldPortalProject({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; issue?: string | string[] }> }) {
  redirect(await oldPortalSectionTarget(undefined, await searchParams))
}
