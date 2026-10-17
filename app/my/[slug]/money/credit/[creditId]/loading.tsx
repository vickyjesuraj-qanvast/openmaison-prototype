import { PortalDocGhost } from '@/components/portal/money/money-ghosts'

/** (gaps build F2, REG-708) A credit note in the portal — the page's PageReveal draws the same ghost. */
export default function Loading() {
  return <PortalDocGhost label="Loading the credit note" />
}
