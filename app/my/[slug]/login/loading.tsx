import { PortalSignInGhost } from '@/components/portal/portal-ghosts'

/** (REG-708) Sign-in's own ghost — the page's PageReveal draws the same one. */
export default function Loading() {
  return <PortalSignInGhost />
}
