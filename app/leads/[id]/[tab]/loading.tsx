import { DetailSkeleton } from '@/components/shell/detail-skeleton'

/**
 * Streams instantly while a tab loads; PageReveal takes over the same skeleton. Every tab is the wide frame —
 * the info column is the Overview's alone since Meetings went wide (REG-247; REG-219 had this file derive the
 * variant from the pathname to guard it). Without this file the [id] boundary above answered for every tab, so a
 * cold load of a table tab (hard refresh, a new tab, the listing's tasks popover) painted the Overview's info
 * column and then handed over to a differently shaped ghost (REG-74).
 */
export default function Loading() {
  return <DetailSkeleton wide />
}
