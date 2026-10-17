import { MeetingLinkGhost } from '@/components/meetings/client/meeting-link-page'

/** (REG-708) The meeting link streams the page's own ghost — the one its reveal holds: the studio's bar and the invitation's card. */
export default function Loading() {
  return <MeetingLinkGhost />
}
