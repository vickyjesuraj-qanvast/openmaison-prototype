import type { Metadata } from 'next'
import { fetchInsights } from '@/lib/leads/insights'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { readFrom } from '@/lib/nav'
import { InsightsView } from '@/components/leads/insights/insights-view'

/** (REG-611, parity Q-24 · R-01) Leads › Insights — 1.0's Performance view on 2.0's records, for Owners and Admins. */
export const metadata: Metadata = { title: 'Insights' }
export const dynamic = 'force-dynamic'

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [viewer, params] = await Promise.all([fetchViewer(), searchParams])
  const data = runsStudio(viewer.role) ? await fetchInsights() : null   // a Designer or a Manager gets the gate, not the numbers
  return <InsightsView data={data} from={readFrom(params.from)} />
}
