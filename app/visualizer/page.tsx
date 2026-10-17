import type { Metadata } from 'next'
import { fetchVisualizerHome } from '@/lib/visualizer/queries'
import { VisualizerHome } from '@/components/visualizer/home/visualizer-home'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

/** Tools › AI Visualizer (REG-673): every design — a lead's, or a personal one — on the house gallery. */
export const metadata: Metadata = { title: 'AI Visualizer' }
export const dynamic = 'force-dynamic'

export default async function VisualizerPage() {
  if (await refusesPath('/visualizer')) return <AccessGate section="AI Visualizer" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const data = await fetchVisualizerHome()
  return <VisualizerHome data={data} />
}
