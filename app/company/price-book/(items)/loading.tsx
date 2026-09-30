import { PriceBookItemsGhost } from '@/components/company/price-book/price-book-ghost'

/** Price book › My Items' own ghost (REG-708): the tab strip, the gallery's toolbar (the Kind pill, Filters), then — (UX audit S8) — the list
    with its folder rows (the grid for a member who picked it, the cards on a phone). Its own route group, so My Sections draws only its own. */
export default function Loading() {
  return <PriceBookItemsGhost />
}
