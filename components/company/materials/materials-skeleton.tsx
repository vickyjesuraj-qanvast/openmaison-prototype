import { LibraryGalleryGhost } from '@/components/company/templates/library-gallery.skeleton'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'

/**
 * Company › Materials' ghost (verify round 1; REG-708): the page header (no tab strip — the section has none; the L2 one with its Back when
 * the page was opened from somewhere, as CompanyShell draws it), then the house gallery's ghost — its toolbar (New Folder · New · search ·
 * Filters · view · ⋯), the Folders row and the swatch cards at the card's own size. (REG-708) `loading.tsx` and the page's PageReveal draw
 * this same one — the usual page, a folder and a row of cards — so the hand-over between them is invisible.
 */
export function MaterialsGhost() {
  return (
    <CompanyGhostFrame title={90} label="Loading materials">
      <LibraryGalleryGhost filters folders={1} cards={4} footLines={2} />
    </CompanyGhostFrame>
  )
}
