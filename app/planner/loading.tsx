import { PlannerHomeGhost } from '@/components/planner/planner-ghosts'

/** Streams at once while the layouts load; PageReveal takes over the same ghost (REG-708). */
export default function Loading() {
  return <PlannerHomeGhost />
}
