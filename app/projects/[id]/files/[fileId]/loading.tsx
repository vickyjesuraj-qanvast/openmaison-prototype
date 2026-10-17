import { ViewerSkeleton } from '@/components/leads/files/viewer-skeleton'

/** Streams instantly while the file loads; PageReveal takes over the same skeleton (the viewer's own layout). */
export default function Loading() {
  return <ViewerSkeleton />
}
