import { LeadsSkeleton } from '@/components/shell/skeleton'

/** Streams instantly while the contracts load; PageReveal takes over the same skeleton (the listing's). */
export default function Loading() {
  return <LeadsSkeleton />
}
