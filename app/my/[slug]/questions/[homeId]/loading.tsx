import { PortalQuestionsGhost } from '@/components/portal/portal-ghosts'

/** (REG-708) The questions page's own ghost — the page's PageReveal draws the same one. */
export default function Loading() {
  return <PortalQuestionsGhost />
}
