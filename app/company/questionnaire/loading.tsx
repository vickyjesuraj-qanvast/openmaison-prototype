import { CompanySkeleton } from '@/components/company/company-shell'

/** The Questionnaire's ghost: the L1 head and the bank's card — no tab strip. */
export default function Loading() {
  return <CompanySkeleton tabs={false} form />
}
