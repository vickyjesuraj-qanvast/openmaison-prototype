'use client'

import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { LibraryGhostFor } from '@/components/company/templates/library-ghost-for'
import { PRICE_BOOK_TABS } from '@/lib/company/sections'
import { useFlagPref } from '@/lib/prefs'

/** My Items' list columns in their default order and tracks (price-book-items.tsx), after the fluid Item column: Kind · Unit · Cost · Markup ·
    Unit price · Category · Vendor · Used by · Updated · Updated by. */
const TRACKS = ['minmax(318px, 1fr)', '110px', '96px', '120px', '120px', '130px', '150px', '160px', '160px', '132px', '200px']
const CELLS = [60, 44, 72, 64, 72, 76, 88, 84, 40, 96]

/**
 * (REG-708 · UX audit S8) Price book › My Items' ghost, as the page picks its view: the list (the default since S8 — the listing's table model)
 * unless this member picked the grid (`om.price-book-items.list`, the page's own key) — and on a phone the cards whatever the pick, as the page
 * does. The route's `loading.tsx` draws it and the page hands the same one to its PageReveal.
 */
export function PriceBookItemsGhost() {
  const [list] = useFlagPref('om.price-book-items.list', true)
  return (
    <CompanyGhostFrame title={100} tabs={PRICE_BOOK_TABS.map((t) => t.label)} label="Loading My Items">
      <LibraryGhostFor page="price-book-items" pill filters folders={2} cards={5} list={list ? { tracks: TRACKS, rows: 6, select: true, cells: CELLS } : undefined} />
    </CompanyGhostFrame>
  )
}
