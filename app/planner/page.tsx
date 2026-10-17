import type { Metadata } from 'next'
import { fetchPlannerHome } from '@/lib/planner/queries'
import { PlannerHome } from '@/components/planner/home/planner-home'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

/** Tools › 3D Space Planner (gaps build J, J-Q2): every layout the member may see, on the house gallery. */
export const metadata: Metadata = { title: '3D Space Planner' }
export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  if (await refusesPath('/planner')) return <AccessGate section="3D Space Planner" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const data = await fetchPlannerHome()
  return <PlannerHome data={data} />
}
