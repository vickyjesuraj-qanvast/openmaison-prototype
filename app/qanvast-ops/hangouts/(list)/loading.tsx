import { HangoutsGhost } from '@/components/hangouts/hangouts-ghost'

/** (REG-708) Qanvast Ops › Hangouts' ghost — the page's PageReveal draws the same one (the event's page keeps its own, beside it). */
export default function Loading() {
  return <HangoutsGhost />
}
