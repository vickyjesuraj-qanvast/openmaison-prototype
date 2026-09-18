import { CompanySkeleton } from '@/components/company/company-shell'

/** Profile's own ghost: the L1 head and two form cards — no tab strip, no card grid. */
export default function Loading() {
  return <CompanySkeleton tabs={false} form />
}
