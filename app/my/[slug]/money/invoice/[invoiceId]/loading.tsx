import { PortalDocGhost } from '@/components/portal/money/money-ghosts'

/** (REG-708) An invoice in the portal — the page's PageReveal draws the same ghost. */
export default function Loading() {
  return <PortalDocGhost label="Loading the invoice" />
}
