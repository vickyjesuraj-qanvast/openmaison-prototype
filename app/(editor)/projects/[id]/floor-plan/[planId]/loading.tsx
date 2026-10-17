import { PlanPrintGhost } from '@/components/projects/floor-plan/plan-print-ghost'

/** (REG-708, gaps build G) The marked plan's page streams its own ghost — the preview's bar and the first paper. */
export default function Loading() {
  return <PlanPrintGhost />
}
