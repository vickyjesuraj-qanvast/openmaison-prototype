import { DetailSkeleton } from '@/components/shell/detail-skeleton'

/** Streams instantly while the lead loads; PageReveal takes over the same skeleton. */
export default function Loading() {
  return <DetailSkeleton />
}
