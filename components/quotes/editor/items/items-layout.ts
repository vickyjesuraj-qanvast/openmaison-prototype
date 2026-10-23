'use client'

import { useSheetLayout } from '@/components/om/sheet'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'

/**
 * (Quotes on the move — P-03 · P-07 · Q-01 · Q-03, his "please go ahead" 2026-10-22) The Items section's four layouts, decided once in render
 * (the server always answers `desktop`, as every `useSyncExternalStore` breakpoint does — lib/breakpoint.ts):
 *   · `phone`   ≤767 — the cards, a line's fields in a bottom sheet, the totals strip and the adds pinned at the bottom;
 *   · `cards`   768–1024 held upright — the cards with a 400 line pane beside them (the list stays in view while a line is edited);
 *   · `grid`    768–1024 held sideways — the working grid: Item · Qty · Unit · Unit price · Total in place, the rest of a line in a pane;
 *   · `desktop` ≥1025 — the mocked grid, byte-identical; a keyboard tablet at 1025+ gets it too (Q-03: a tablet never shows the full grid).
 * `TABLET_PORTRAIT` is the one literal this module adds to the breakpoint system: the proposal's own words are "768 portrait" and "1024
 * landscape", and orientation is how a person holds the tablet.
 */
export const TABLET_PORTRAIT = '(min-width: 768px) and (max-width: 1024px) and (orientation: portrait)'
export type ItemsLayout = 'desktop' | 'grid' | 'cards' | 'phone'

export function useItemsLayout(): ItemsLayout {
  const phone = useSheetLayout()
  const tablet = useMediaQuery(TABLET_DOWN)
  const portrait = useMediaQuery(TABLET_PORTRAIT)
  return phone ? 'phone' : !tablet ? 'desktop' : portrait ? 'cards' : 'grid'
}
