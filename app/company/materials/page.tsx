import type { Metadata } from 'next'
import { fetchStudioMaterials } from '@/lib/visualizer/queries'
import { MaterialsView } from '@/components/company/materials/materials-view'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Company · Materials' }
export const dynamic = 'force-dynamic'

/** Company › Materials (REG-677, AI Visualizer Q-18): the studio's own finishes for the AI Visualizer's picker. */
export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/materials')) return <AccessGate section="Materials" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp] = await Promise.all([fetchStudioMaterials(), searchParams])
  return <MaterialsView data={data} from={readFrom(sp.from)} />
}
