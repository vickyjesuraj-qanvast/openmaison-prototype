/**
 * (pending modules S06 — REG-1577's call, as recommended) The house categorical palette's slots, in their fixed order
 * (components/om/category-palette.module.css): four named hues, then "Other". A chart names at most `CATEGORY_SLOTS` categories and folds the
 * rest into Other — never a fifth hue. Client-safe.
 */
export const CATEGORY_SLOTS = 4
export type CategorySlot = 'c1' | 'c2' | 'c3' | 'c4' | 'other'
/** The slot of the i-th named category (0-based); past the four, Other. */
export const slotOf = (i: number): CategorySlot => (i < CATEGORY_SLOTS ? (`c${i + 1}` as CategorySlot) : 'other')
