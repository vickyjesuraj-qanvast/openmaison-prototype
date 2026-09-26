import { VisualizerEditorSkeleton } from '@/components/visualizer/skeletons'

/** Streams at once while the design loads — the editor's own frame, so nothing jumps when it lands. */
export default function Loading() {
  return <VisualizerEditorSkeleton />
}
