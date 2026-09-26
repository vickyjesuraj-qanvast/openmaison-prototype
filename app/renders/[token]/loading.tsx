import { RenderShareSkeleton } from '@/components/visualizer/skeletons'

/** The client's link streams its own ghost while the renders load (sweep S2 #22's rule for every link a client opens). */
export default function Loading() {
  return <RenderShareSkeleton />
}
