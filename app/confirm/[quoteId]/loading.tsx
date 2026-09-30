import { ConfirmSkeleton } from '@/components/quotes/confirm/confirm-skeleton'

/** (REG-708) The quote's confirmation link streams a ghost as every link a client opens does (sweep S2 #22) — the studio's bar, the paper and
    the card at its side; (UX audit Q6) on a phone, the reading cards the page draws there, and the card's Ask for a change. */
export default function Loading() {
  return <ConfirmSkeleton />
}
