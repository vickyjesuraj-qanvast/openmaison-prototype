import { LayoutPrintGhost } from '@/components/planner/planner-ghosts'

/** Streams at once while the paper loads; PageReveal takes over the same ghost. */
export default function Loading() {
  return <LayoutPrintGhost />
}
