import { redirect } from 'next/navigation'
import { oldPlannerTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S41b-2) 1.0's Tools › 3D Space Planner: the planner, on `?planId=`'s layout when the member may open it. */
export default async function OldFloorPlanTool({ searchParams }: { searchParams: Promise<{ planId?: string | string[] }> }) {
  const { planId } = await searchParams
  redirect(await oldPlannerTarget(typeof planId === 'string' ? planId : null))
}
