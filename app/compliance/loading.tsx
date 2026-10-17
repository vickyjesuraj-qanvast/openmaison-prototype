import { NavigatorGhost } from '@/components/compliance/navigator-ghost'

/** (REG-708, gaps build I) Streams instantly while the Navigator loads; the page's PageReveal holds the same ghost. */
export default function Loading() {
  return <NavigatorGhost />
}
