import { MeetingsListGhost } from '@/components/meetings/meetings-workspace-ghost'

/** (pending modules S23 · REG-708) The page's own ghost — PageReveal draws the same one. */
export default function Loading() {
  return <MeetingsListGhost />
}
