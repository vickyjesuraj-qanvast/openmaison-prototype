import { FloorplanGhost } from '@/components/floorplan-3d/floorplan-ghost'
import { floorplanLive } from '@/lib/floorplan-3d/service'

/** Streams instantly; the page's PageReveal takes over the same ghost (REG-708). */
export default function Loading() {
  return <FloorplanGhost live={floorplanLive()} />
}
