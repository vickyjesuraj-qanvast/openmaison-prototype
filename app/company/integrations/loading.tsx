import { CompanySkeleton } from '@/components/company/company-shell'

/** (sweep S4 #26) Integrations' ghost: the L1 head and a column of cards — no tab strip, no gallery grid. */
export default function Loading() {
  return <CompanySkeleton tabs={false} form />
}
