import { MeetingRoomGhost } from '@/components/meetings/room/meeting-room-ghost'

/** (pending modules S23 · REG-708) The meeting page's ghost, in the moment this browser saw it last — its PageReveal draws the same one. */
export default function Loading() {
  return <MeetingRoomGhost />
}
