import { ReportsGhost } from '@/components/company/reports/reports-ghost'

/** (REG-1361, REG-708) Streams instantly while a report loads; PageReveal takes over the same ghost — the tab's own shape, read from the address. */
export default function Loading() {
  return <ReportsGhost />
}
