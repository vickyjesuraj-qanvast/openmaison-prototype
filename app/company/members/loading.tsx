import { CompanySkeleton } from '@/components/company/company-shell'

/** Members' ghost: the L1 head and a form card — no tab strip. */
export default function Loading() {
  return <CompanySkeleton tabs={false} form />
}
