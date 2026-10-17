import { HangoutPublicGhost } from '@/components/hangouts/public/hangout-public-ghost'

/** (REG-708) A homeowner's own page streams its own ghost — the one its reveal holds. */
export default function Loading() {
  return <HangoutPublicGhost own />
}
