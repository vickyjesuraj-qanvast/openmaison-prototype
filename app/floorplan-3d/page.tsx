import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'
import { floorplanLive } from '@/lib/floorplan-3d/service'
import { FloorplanTool } from '@/components/floorplan-3d/floorplan-tool'

/** Tools › Floorplan to 3D Isometric (REG-2800): 1.0's module on its own page — a floor-plan photo to a Dollhouse or Top-down 3D view. */
export const metadata: Metadata = { title: 'Floorplan to 3D Isometric' }
export const dynamic = 'force-dynamic'

export default async function FloorplanPage() {
  if (await refusesPath('/floorplan-3d')) return <AccessGate section="Floorplan to 3D Isometric" />   // the planner's and the Visualizer's roles: not Accounting, not Marketing
  return <FloorplanTool live={floorplanLive()} />
}
