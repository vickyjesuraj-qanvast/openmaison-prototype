import type { Metadata } from 'next'
import { fetchVisualizerHome } from '@/lib/visualizer/queries'
import { VisualizerHome } from '@/components/visualizer/home/visualizer-home'

/** Tools › AI Visualizer (REG-673): every design — a lead's, or a personal one — on the house gallery. */
export const metadata: Metadata = { title: 'AI Visualizer' }
export const dynamic = 'force-dynamic'

export default async function VisualizerPage() {
  const data = await fetchVisualizerHome()
  return <VisualizerHome data={data} />
}
