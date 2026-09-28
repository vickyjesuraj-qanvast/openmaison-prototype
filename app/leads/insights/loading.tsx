import { InsightsGhost } from '@/components/leads/insights/insights-ghost'

/** Streams instantly while the facts load; PageReveal takes over the same ghost — (REG-708) Insights' own: the chips, the tiles, By team member. */
export default function Loading() {
  return <InsightsGhost />
}
