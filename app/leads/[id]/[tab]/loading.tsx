import { DetailTabSkeleton } from '@/components/shell/detail-tab-skeleton'

/**
 * Streams instantly while a tab loads; PageReveal takes over the same skeleton. Every tab is the wide frame —
 * the info column is the Overview's alone since Meetings went wide (REG-247). Without this file the [id] boundary above answered for
 * every tab (REG-74). (REG-708) Each tab now draws its own body — its toolbar and its table, grid, list or cards — read from the address.
 */
export default function Loading() {
  return <DetailTabSkeleton />
}
