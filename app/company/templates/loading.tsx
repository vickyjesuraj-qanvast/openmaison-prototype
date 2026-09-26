import { CompanySkeleton } from '@/components/company/company-shell'

/** (audit 2026-09-26, round 3) Company › Templates' library tabs (Quotes · Contracts · Tasks · T&Cs & Notes · Payments): the header, the tab
    strip, then the gallery's own toolbar, Folders row and cards — so the reveal lands in place (Brand kit keeps its form ghost). */
export default function Loading() {
  return <CompanySkeleton gallery />
}
