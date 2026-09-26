import { LeadsSkeleton } from '@/components/shell/skeleton'

/** Streams instantly while the facts load; PageReveal takes over the same skeleton. */
export default function Loading() {
  return <LeadsSkeleton l1={false} />
}
