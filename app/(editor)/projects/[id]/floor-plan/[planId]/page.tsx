import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { fetchFloorPlanData } from '@/lib/projects/floor-plan'
import { PlanPrint } from '@/components/projects/floor-plan/plan-print'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; planId: string }> }): Promise<Metadata> {
  const { id, planId } = await params
  if (await refusesPath(`/projects/${id}/floor-plan/${planId}`)) return { title: 'Projects' }   // (S44O — C6)
  const d = await fetchFloorPlanData(id, planId)
  const plan = d?.plans.find((p) => p.id === d.planId)
  return { title: d && plan ? `${plan.name} · ${d.project.name}` : 'Floor plan' }
}

/** (gaps build G, G-Q13) The marked plan for the contractor — page one the plan with its marks, page two its legend; `?print=1` prints. Who sees:
    the project's lead's rule (a plan not on this project, or put away, answers not found). */
export default async function PlanPrintPage({ params, searchParams }: { params: Promise<{ id: string; planId: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const [{ id, planId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/projects/${id}/floor-plan/${planId}`)) return <AccessGate section="Projects" />   // (S44O — call C6) a project's papers are never Marketing's — before a record is read
  const d = await fetchFloorPlanData(id, planId)
  if (!d || d.planId !== planId) notFound()
  return <PlanPrint data={d} from={readFrom(sp.from)} print={sp.print === '1'} />
}
