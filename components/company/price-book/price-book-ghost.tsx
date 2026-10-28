'use client'

import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { LibraryGhostFor } from '@/components/company/templates/library-ghost-for'
import { PRICE_BOOK_TABS } from '@/lib/company/sections'
import { useCountPref, useFlagPref } from '@/lib/prefs'
import { useSeedFlag } from '@/lib/ghost-shape'   // (pending modules S41b-1)

/** My Items' list columns in their default order and tracks (price-book-items.tsx), after the fluid Item column: Type · Unit · Cost · Markup ·
    Unit price · Trade · Vendor · Used by · Updated · Updated by — (the calm UI build 2026-10-27, the UI audit's 4-12) Status rests in Column
    settings now (a proposal says so as a chip in its name cell), so its 150px track left the ghost as it left the list. */
const TRACKS = ['minmax(318px, 1fr)', '110px', '96px', '120px', '120px', '130px', '150px', '160px', '160px', '132px', '200px']
const CELLS = [60, 44, 72, 64, 72, 76, 88, 84, 40, 96]

/**
 * (REG-708 · UX audit S8) Price book › My Items' ghost, as the page picks its view: the list (the default since S8 — the listing's table model)
 * unless this member picked the grid (`om.price-book-items.list`, the page's own key) — and on a phone the cards whatever the pick, as the page
 * does. The route's `loading.tsx` draws it and the page hands the same one to its PageReveal.
 */
/** (the calm UI build 2026-10-27 — the closing regression) How many items wait for approval, as the page last drew its to-do chip — the loader's
    answer (else the app shell's seed `lib.price-book-items.todo`: one waits now, as the server knows it); the page's own reveal is told (`todo`). */
export const ITEMS_TODO_KEY = 'om.shape.lib.price-book-items.todo'

export function PriceBookItemsGhost({ todo }: { /** the page's own count of items waiting for approval (its reveal); the loader reads the last one */ todo?: number } = {}) {
  const [list] = useFlagPref('om.price-book-items.list', true)
  const remembered = useCountPref(ITEMS_TODO_KEY, useSeedFlag('lib.price-book-items.todo', false) ? 1 : 0)
  const waiting = todo ?? remembered
  /* (pending modules S41b-1) a member who doesn't see costs has no Cost and Markup columns (the 4th and 5th tracks, the 3rd and 4th cells) */
  const costs = useSeedFlag('role.costs', true)
  const tracks = costs ? TRACKS : TRACKS.filter((_, i) => i !== 3 && i !== 4)
  const cells = costs ? CELLS : CELLS.filter((_, i) => i !== 2 && i !== 3)
  return (
    <CompanyGhostFrame title={100} tabs={PRICE_BOOK_TABS.map((t) => t.label)} label="Loading My Items">
      {/* (the calm UI build 2026-10-27 — the closing regression) the pill says its noun at every width now ("Type: All", 4-24) and the to-do
          chip stands before it while an item waits ("1 approval", "1" ≤1024): on a phone the two push the tools onto a second line, as the page's do */}
      <LibraryGhostFor page="price-book-items" pill="Type: All" todos={waiting > 0 ? [{ label: `${waiting} ${waiting === 1 ? 'approval' : 'approvals'}`, short: String(waiting) }] : []}
                       filters folders={2} cards={5} list={list ? { tracks, rows: 6, select: true, cells } : undefined} />
    </CompanyGhostFrame>
  )
}

/** My Sections' list columns (price-book-sections.tsx): Items · Property type · Tags · Total · Used by · Updated · Updated by. */
const SECTION_TRACKS = ['minmax(318px, 1fr)', '100px', '170px', '180px', '140px', '160px', '132px', '200px']
const SECTION_CELLS = [32, 72, 80, 72, 84, 40, 96]

/**
 * (The calm UI build 2026-10-27, the UI audit's 4-37) Price book › My Sections' ghost: the page opens as the list now, as My Items does (one
 * default view for the page's two tabs) — unless this member picked the grid (`om.price-book-sections.list`, the page's own key) — and the cards
 * on a phone. The route's `loading.tsx` draws it (through SectionsLoading) and the page hands the same one to its PageReveal.
 */
export function PriceBookSectionsGhost() {
  const [list] = useFlagPref('om.price-book-sections.list', true)
  return (
    <CompanyGhostFrame title={100} tabs={PRICE_BOOK_TABS.map((t) => t.label)} label="Loading My Sections">
      <LibraryGhostFor page="price-book-sections" folders={1} cards={4} list={list ? { tracks: SECTION_TRACKS, rows: 4, select: true, cells: SECTION_CELLS } : undefined} />
    </CompanyGhostFrame>
  )
}
