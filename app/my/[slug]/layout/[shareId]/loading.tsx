import { LayoutViewerGhost } from '@/components/planner/planner-ghosts'

/** Streams at once while the layout loads; PageReveal takes over the same ghost. */
export default function Loading() {
  return <LayoutViewerGhost />
}
