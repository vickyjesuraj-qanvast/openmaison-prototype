import { LeadsSkeleton } from '@/components/shell/skeleton'

/** Streams instantly while the tasks load; PageReveal takes over the same skeleton (a table under a header, as Tools › Quotes). */
export default function Loading() {
  return <LeadsSkeleton />
}
