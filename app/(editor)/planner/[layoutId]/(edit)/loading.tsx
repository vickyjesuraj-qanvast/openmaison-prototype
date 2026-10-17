import { PlannerEditorGhost } from '@/components/planner/planner-ghosts'

/** Streams at once while the layout loads — the editor's own frame, so nothing jumps when it lands. */
export default function Loading() {
  return <PlannerEditorGhost />
}
