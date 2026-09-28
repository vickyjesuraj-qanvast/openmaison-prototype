import { PriceBookGhost } from '@/components/company/company-ghosts'

/** Price book › My Items' own ghost (REG-708): the tab strip, the gallery's toolbar (the Kind pill, Filters), the Folders row, a row of cards. Its own
    route group, so My Sections draws only its own. */
export default function Loading() {
  return <PriceBookGhost />
}
