import { DashboardGhost } from '@/components/dashboard/dashboard-ghost'

/** (pending modules S22 · REG-708) The Dashboard's own ghost — PageReveal draws the same one, for whoever is signed in (the shell's seed). */
export default function Loading() {
  return <DashboardGhost />
}
