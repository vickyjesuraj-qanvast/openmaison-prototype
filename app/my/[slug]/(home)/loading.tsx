import { PortalHomeGhost } from '@/components/portal/portal-ghosts'

/** (REG-708) The portal home's own ghost — the page's PageReveal draws the same one. */
export default function Loading() {
  return <PortalHomeGhost />
}
