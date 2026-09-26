import { VisualizerHomeGhost } from '@/components/visualizer/home/home-skeleton'

/** Streams instantly while the designs load; PageReveal takes over the same ghost, drawn with what the page knows (REG-673, F166). */
export default function Loading() {
  return <VisualizerHomeGhost />
}
