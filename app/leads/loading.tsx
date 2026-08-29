import { LeadsSkeleton } from '@/components/shell/skeleton'

/** Streams instantly while the listing data loads; PageReveal takes over the same skeleton. */
export default function Loading() {
  return <LeadsSkeleton />
}
