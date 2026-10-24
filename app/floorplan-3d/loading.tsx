import { FloorplanGhost } from '@/components/floorplan-3d/floorplan-ghost'

/** Streams instantly; the page's PageReveal takes over the same ghost (REG-708). */
export default function Loading() {
  return <FloorplanGhost />
}
