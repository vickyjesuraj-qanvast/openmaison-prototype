import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { fetchPlannerEditor } from '@/lib/planner/queries'
import { LayoutPrint } from '@/components/planner/print/layout-print'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ layoutId: string }> }): Promise<Metadata> {
  const { layoutId } = await params
  if (await refusesPath(`/planner/${layoutId}/print`)) return { title: '3D Space Planner' }   // (S44Z) no record's name in a tab that is not theirs
  const d = await fetchPlannerEditor(layoutId)
  return { title: d ? `${d.layout.name}${d.project ? ` · ${d.project.name}` : ''}` : '3D Space Planner' }
}

/** (gaps build J, J-Q13) A layout's paper — page one the plan, page two a 3D view, the rooms and the furniture; `?print=1` prints. Who sees:
    the layout's rule (a project's follows its lead). */
export default async function LayoutPrintPage({ params, searchParams }: { params: Promise<{ layoutId: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const [{ layoutId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/planner/${layoutId}/print`)) return <AccessGate section="3D Space Planner" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const d = await fetchPlannerEditor(layoutId)
  if (!d) notFound()
  return <LayoutPrint data={d} from={readFrom(sp.from)} print={sp.print === '1'} />
}
