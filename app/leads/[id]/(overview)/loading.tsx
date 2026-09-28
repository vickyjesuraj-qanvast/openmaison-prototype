import { DetailSkeleton } from '@/components/shell/detail-skeleton'

/** Streams instantly while the lead loads; PageReveal takes over the same skeleton. Overview only — the tabs
 *  answer with their own wide ghost in `[tab]/loading.tsx`. */
export default function Loading() {
  return <DetailSkeleton />
}
