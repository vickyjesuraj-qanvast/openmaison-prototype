import { ConfirmSkeleton } from '@/components/quotes/confirm/confirm-skeleton'

/** (REG-708) The view-only link streams the page's own ghost: the letterhead bar, the paper (the reading cards on a phone) and its card. */
export default function Loading() {
  return <ConfirmSkeleton card="view" />
}
