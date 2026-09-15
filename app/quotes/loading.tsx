import { LeadsSkeleton } from '@/components/shell/skeleton'

/** Streams instantly while the quotes load; PageReveal takes over the same skeleton (the listing's — a table under a header, REG-422). */
export default function Loading() {
  return <LeadsSkeleton />
}
