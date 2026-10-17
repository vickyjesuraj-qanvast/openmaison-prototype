import { HangoutPublicGhost } from '@/components/hangouts/public/hangout-public-ghost'

/** (REG-708) The studio's Hangout page streams its own ghost — the one its reveal holds. */
export default function Loading() {
  return <HangoutPublicGhost />
}
