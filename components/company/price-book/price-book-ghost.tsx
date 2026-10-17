'use client'

import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { LibraryGhostFor } from '@/components/company/templates/library-ghost-for'
import { PRICE_BOOK_TABS } from '@/lib/company/sections'
import { useFlagPref } from '@/lib/prefs'
import { useSeedFlag } from '@/lib/ghost-shape'   // (pending modules S41b-1)

/** My Items' list columns in their default order and tracks (price-book-items.tsx), after the fluid Item column: (REG-820) Status · Kind · Unit ·
    Cost · Markup · Unit price · Category · Vendor · Used by · Updated · Updated by — (pending modules S17) the ghost had no Status, so every
    head after the name stood 150px left of the page's. */
const TRACKS = ['minmax(318px, 1fr)', '150px', '110px', '96px', '120px', '120px', '130px', '150px', '160px', '160px', '132px', '200px']
const CELLS = [64, 60, 44, 72, 64, 72, 76, 88, 84, 40, 96]

/**
 * (REG-708 · UX audit S8) Price book › My Items' ghost, as the page picks its view: the list (the default since S8 — the listing's table model)
 * unless this member picked the grid (`om.price-book-items.list`, the page's own key) — and on a phone the cards whatever the pick, as the page
 * does. The route's `loading.tsx` draws it and the page hands the same one to its PageReveal.
 */
export function PriceBookItemsGhost() {
  const [list] = useFlagPref('om.price-book-items.list', true)
  /* (pending modules S41b-1) a member who doesn't see costs has no Cost and Markup columns (the 5th and 6th tracks, the 4th and 5th cells) */
  const costs = useSeedFlag('role.costs', true)
  const tracks = costs ? TRACKS : TRACKS.filter((_, i) => i !== 4 && i !== 5)
  const cells = costs ? CELLS : CELLS.filter((_, i) => i !== 3 && i !== 4)
  return (
    <CompanyGhostFrame title={100} tabs={PRICE_BOOK_TABS.map((t) => t.label)} label="Loading My Items">
      <LibraryGhostFor page="price-book-items" pill filters folders={2} cards={5} list={list ? { tracks, rows: 6, select: true, cells } : undefined} />
    </CompanyGhostFrame>
  )
}
