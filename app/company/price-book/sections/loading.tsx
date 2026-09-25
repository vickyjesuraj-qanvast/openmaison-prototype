import { CompanySkeleton } from '@/components/company/company-shell'
import { PRICE_BOOK_TABS, tabBones } from '@/lib/company/sections'

/** The Price book's ghost: the L1 head, the two-tab strip, card bones. */
export default function Loading() {
  return <CompanySkeleton tabWidths={tabBones(PRICE_BOOK_TABS.map((t) => t.label))} />
}
