import { LayoutViewerGhost } from '@/components/planner/planner-ghosts'

/** Streams at once while the shared layout loads; PageReveal takes over the same ghost. */
export default function Loading() {
  return <LayoutViewerGhost />
}
